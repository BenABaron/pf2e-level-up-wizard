const abilityScoreIncreaseLevels = [5, 10, 15, 20];
const newSpellRankLevels = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

const stripParagraphTags = (html) => html?.replace(/^<p>|<\/p>$/g, '') || '';

export const getClassSpecificDescription = (description, characterClass) => {
  if (!description || !characterClass) return description;

  const regex = new RegExp(`<p><strong>(.*?)</strong>(.*?)</p>`, 'gi');

  let match;
  while ((match = regex.exec(description))) {
    const classes = match[1].split(',').map((c) => c.trim().toLowerCase());
    if (classes.includes(characterClass.toLowerCase())) {
      return `<p>${match[2].trim()}</p>`;
    }
  }

  return description;
};

const mapFeaturesWithDetails = async (features, characterClass) => {
  return Promise.all(
    features.map(async (feature) => {
      const item = await fromUuid(feature.uuid).catch(() => null);
      if (!item) return null;

      const filteredDescription = getClassSpecificDescription(
        item.system.description.value,
        characterClass
      );

      return {
        name: feature.name,
        description: stripParagraphTags(filteredDescription),
        img: feature.img || item.img,
        uuid: feature.uuid
      };
    })
  ).then((results) => results.filter((feature) => feature));
};

export const getFeaturesForLevel = async (characterData, targetLevel) => {
  const characterClass = characterData?.class?.name;
  const spellcasting = characterData?.class?.system?.spellcasting;
  const featuresArray = Object.values(characterData?.class?.system?.items);

  const featuresForLevel = featuresArray.filter(
    (boon) => boon.level === targetLevel
  );

  const featuresWithDetails = await mapFeaturesWithDetails(
    featuresForLevel,
    characterClass
  );

  return {
    featuresForLevel: featuresWithDetails,
    abilityScoreIncreaseLevel: abilityScoreIncreaseLevels.includes(targetLevel),
    newSpellRankLevel: newSpellRankLevels.includes(targetLevel) && spellcasting,
    spellcasting
  };
};

export const detectPartialBoosts = (actor) => {
  const abilities = actor.system.abilities;
  const buildData = actor.system.build.attributes;

  const boostCounts = {};

  Object.entries(buildData.boosts).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((boost) => {
        boostCounts[boost] = (boostCounts[boost] || 0) + 1;
      });
    } else if (key === 'class' && typeof value === 'string') {
      boostCounts[value] = (boostCounts[value] || 0) + 1;
    }
  });

  Object.values(buildData.flaws).forEach((flawArray) => {
    flawArray.forEach((flaw) => {
      boostCounts[flaw] = (boostCounts[flaw] || 0) - 1;
    });
  });

  return Object.entries(abilities).map(([key, ability]) => {
    const currentCount = boostCounts[key] || 0;
    const mod = ability.mod;

    const isPartial = mod >= 4 && currentCount % 2 === 0;

    return {
      key,
      mod,
      isPartial
    };
  });
};
