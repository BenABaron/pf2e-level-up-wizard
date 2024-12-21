import { module_name } from '../main.js';
import { normalizeString } from './utility.js';

const freeArchetypeFeatLevels = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const ancestryParagonFeatLevels = [1, 3, 7, 11, 15, 19];

let cachedFeats = null;

const getCachedFeats = async () => {
  if (!cachedFeats) {
    const featsCompendium = game.packs.get('pf2e.feats-srd');
    cachedFeats = await featsCompendium.getDocuments();
  }
  return cachedFeats;
};

const filterFeats = async (searchQueries, targetLevel, existingFeats) => {
  const feats = await getCachedFeats();

  const normalizedQueries = Array.isArray(searchQueries)
    ? searchQueries.map(normalizeString)
    : [normalizeString(searchQueries)];

  return feats.filter((feat) => {
    const traits = feat.system.traits.value.map(normalizeString);
    const isTaken = existingFeats.includes(feat.name.toLowerCase());
    const maxTakable = feat.system.maxTakable;

    return (
      normalizedQueries.some((query) => traits.includes(query)) &&
      feat.system.level.value <= targetLevel &&
      !(isTaken && maxTakable === 1)
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
  includeArchetypeFeats = false,
  dualClassName
) => {
  let levelsArray = [];

  switch (type) {
    case 'archetype':
      levelsArray = freeArchetypeFeatLevels;
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
    archetype: 'archetype'
  };

  let searchQuery = queryMap[type];
  if (type === 'ancestry') {
    const heritage = characterData?.heritage?.name;
    if (heritage) {
      searchQuery = [characterData?.ancestry?.name, heritage];

      // Handle special cases for versatile heritages
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

  const archetypeFeats = includeArchetypeFeats
    ? await filterFeats('archetype', targetLevel, existingFeats)
    : [];

  const allFeats = [...feats, ...archetypeFeats];

  const sortMethod = game.settings.get(module_name, 'feat-sort-method');

  return sortFeats(allFeats, sortMethod);
};
