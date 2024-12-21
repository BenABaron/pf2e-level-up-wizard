const abilityScoreIncreaseLevels = [5, 10, 15, 20];
const newSpellRankLevels = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

const stripParagraphTags = (html) => html?.replace(/^<p>|<\/p>$/g, '') || '';

const getIconClassForUUID = async (uuid) => {
  const typeMapping = {
    conditionitems: 'fa-solid fa-face-zany',
    classfeatures: 'fa-solid fa-medal',
    'feats-srd': 'fa-solid fa-medal',
    actionspf2e: 'fa-solid fa-running',
    'spells-srd': 'fa-solid fa-sparkles',
    'feat-effects': 'fa-solid fa-person-rays'
  };

  const uuidParts = uuid.split('.');
  const packName = uuidParts[2];

  if (packName === 'equipment-srd') {
    return await getEquipmentIconClass(uuid);
  }

  return typeMapping[packName] || 'fa-solid fa-file-lines';
};

const getEquipmentIconClass = async (uuid) => {
  try {
    const item = await fromUuid(uuid);
    const equipmentType = item?.type;

    const equipmentMapping = {
      weapon: 'fa-solid fa-sword',
      shield: 'fa-solid fa-shield-halved',
      equipment: 'fa-solid fa-hat-cowboy'
    };

    return equipmentMapping[equipmentType] || 'fa-solid fa-file-lines';
  } catch (error) {
    console.error(`Error fetching equipment data for UUID ${uuid}:`, error);
    return 'fa-solid fa-file-lines';
  }
};

const replaceUUIDsWithLinks = async (description) => {
  const uuidRegex = /@UUID\[([^\]]+)\]\{([^}]+)\}/g;
  const matches = [...description.matchAll(uuidRegex)];

  const replacements = await Promise.all(
    matches.map(async ([fullMatch, uuid, name]) => {
      const iconClass = await getIconClassForUUID(uuid);
      return {
        fullMatch,
        replacement: `<a class="content-link" data-link data-uuid="${uuid}"><i class="${iconClass}"></i>${name}</a>`
      };
    })
  );

  let enrichedDescription = description;
  for (const { fullMatch, replacement } of replacements) {
    enrichedDescription = enrichedDescription.replace(fullMatch, replacement);
  }

  return enrichedDescription;
};

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

      const enrichedDescription = await replaceUUIDsWithLinks(
        stripParagraphTags(filteredDescription)
      );

      return {
        name: feature.name,
        description: enrichedDescription,
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
