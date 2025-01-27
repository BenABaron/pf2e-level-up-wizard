import { module_name } from '../main.js';
import { normalizeString } from './utility.js';

const freeArchetypeAndMythicFeatLevels = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const ancestryParagonFeatLevels = [1, 3, 7, 11, 15, 19];

let cachedFeats = null;

const getCachedFeats = async () => {
  if (!cachedFeats) {
    let allFeats = [];

    const defaultCompendium = game.packs.get('pf2e.feats-srd');
    if (defaultCompendium) {
      const defaultFeats = await defaultCompendium.getDocuments();
      allFeats = allFeats.concat(defaultFeats);
    }

    const additionalCompendiumsSetting = game.settings.get(
      module_name,
      'additional-feat-compendiums'
    );

    if (additionalCompendiumsSetting) {
      const compendiumKeys = additionalCompendiumsSetting
        .split(',')
        .map((key) => key.trim());

      for (const key of compendiumKeys) {
        const compendium = game.packs.get(key);
        if (compendium) {
          try {
            const collection = await compendium.getDocuments();

            const feats = collection.filter(
              (item) =>
                item.type === 'feat' && item.system.category !== 'classfeature'
            );
            allFeats = allFeats.concat(feats);
          } catch (err) {
            ui.notifications.warn(
              game.i18n.format(
                'PF2E_LEVEL_UP_WIZARD.notifications.additionalCompendiums.failedToLoad',
                {
                  key
                }
              ),
              err
            );
          }
        } else {
          ui.notifications.warn(
            game.i18n.format(
              'PF2E_LEVEL_UP_WIZARD.notifications.additionalCompendiums.compendiumNotFound',
              {
                key
              }
            )
          );
        }
      }
    }

    cachedFeats = allFeats;
  }

  return cachedFeats;
};

const loadManualArchetypeFeats = async () => {
  const jsonPath =
    'modules/pf2e-level-up-wizard/src/data/grantedArchetypeFeats.json';
  try {
    return await foundry.utils.fetchJsonWithTimeout(jsonPath);
  } catch (error) {
    console.error(`Failed to load manual archetype feats: ${error}`);
    return {};
  }
};

const filterFeats = async (searchQueries, targetLevel, existingFeats) => {
  const feats = await getCachedFeats();
  const manualArchetypeFeats = await loadManualArchetypeFeats();

  const normalizedQueries = Array.isArray(searchQueries)
    ? searchQueries.map(normalizeString)
    : [normalizeString(searchQueries)];

  return feats.filter((feat) => {
    const traits = feat.system.traits.value.map(normalizeString);
    const isTaken = existingFeats.includes(feat.name.toLowerCase());
    const maxTakable = feat.system.maxTakable;

    const isManualArchetypeFeat =
      normalizedQueries.includes('archetype') &&
      Object.values(manualArchetypeFeats).flat().includes(feat.slug);

    const isDestinyTraitExcluded =
      targetLevel > 12 && traits.includes('destiny');

    return (
      (normalizedQueries.some((query) => traits.includes(query)) ||
        isManualArchetypeFeat) &&
      feat.system.level.value <= targetLevel &&
      !(isTaken && maxTakable === 1) &&
      !isDestinyTraitExcluded
    );
  });
};

const sortFeats = (feats, method) => {
  switch (method) {
    case 'LEVEL_ASC':
      return feats.sort((a, b) =>
        a.system.level.value !== b.system.level.value
          ? a.system.level.value - b.system.level.value
          : a.name.localeCompare(b.name)
      );
    case 'ALPHABETICAL':
      return feats.sort((a, b) => a.name.localeCompare(b.name));
    case 'LEVEL_DESC':
    default:
      return feats.sort((a, b) =>
        a.system.level.value !== b.system.level.value
          ? b.system.level.value - a.system.level.value
          : a.name.localeCompare(b.name)
      );
  }
};

const getExistingFeats = (actor) => {
  return actor.items
    .filter((item) => item.type === 'feat')
    .map((item) => item.name.toLowerCase());
};

export const getFeatsForLevel = async (
  characterData,
  type,
  targetLevel,
  dualClassName
) => {
  let levelsArray = [];

  switch (type) {
    case 'archetype':
    case 'mythic':
      levelsArray = freeArchetypeAndMythicFeatLevels;
      break;
    case 'ancestryParagon':
      levelsArray = ancestryParagonFeatLevels;
      break;
    default:
      levelsArray = characterData?.class?.system?.[`${type}FeatLevels`]?.value;
      break;
  }

  if (!levelsArray.includes(targetLevel)) return;

  const queryMap = {
    class: dualClassName || characterData?.class?.name,
    ancestry: characterData?.ancestry?.name,
    ancestryParagon: characterData?.ancestry?.name,
    general: 'general',
    skill: 'skill',
    archetype: 'archetype',
    mythic: targetLevel !== 12 ? 'mythic' : 'destiny'
  };

  let searchQuery = queryMap[type];
  if (type === 'ancestry' || type === 'ancestryParagon') {
    const heritage = characterData?.heritage?.name;
    if (heritage) {
      searchQuery = [characterData?.ancestry?.name, heritage];

      if (heritage === 'Aiuvarin') {
        searchQuery.push('Elf');
      } else if (heritage === 'Dromaar') {
        searchQuery.push('Orc');
      }
    }
  }
  if (!searchQuery) {
    console.error(`Unknown feat type: ${type}`);
    return;
  }

  const existingFeats = getExistingFeats(characterData);
  const feats = await filterFeats(searchQuery, targetLevel, existingFeats);

  const archetypeFeats =
    type === 'class'
      ? await filterFeats('archetype', targetLevel, existingFeats)
      : [];

  archetypeFeats.forEach((feat) => {
    feat.isArchetypeFeat = true;
    if (feats.some((classFeat) => feat.slug === classFeat.slug)) {
      feat.isArchetypeFeat = false;
    }
  });

  const uniqueArchetypeFeats = archetypeFeats?.filter(
    (archetypeFeat) => !feats.some((feat) => feat.slug === archetypeFeat.slug)
  );

  const allFeats = [...feats, ...uniqueArchetypeFeats];

  const sortMethod = game.settings.get(module_name, 'feat-sort-method');

  return sortFeats(allFeats, sortMethod);
};
