import { module_name } from './pf2e-level-up-wizard.js';

let cachedFeats = null;

/** CONSTANTS */
const abilityScoreIncreaseLevels = [5, 10, 15, 20];
const newSpellRankLevels = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const freeArchetypeFeatLevels = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const ancestryParagonFeatLevels = [1, 3, 7, 11, 15, 19];

export const skillProficiencyRanks = {
  0: 'Untrained',
  1: 'Trained',
  2: 'Expert',
  3: 'Master',
  4: 'Legendary'
};

/** UTILITY */
const getCachedFeats = async () => {
  if (!cachedFeats) {
    const featsCompendium = game.packs.get('pf2e.feats-srd');
    cachedFeats = await featsCompendium.getDocuments();
  }
  return cachedFeats;
};

const getExistingFeats = (actor) => {
  return actor.items
    .filter((item) => item.type === 'feat')
    .map((item) => item.name.toLowerCase());
};

export const normalizeString = (str) => str.replace(/\s+/g, '-').toLowerCase();

export const getSkillRankClass = (rank) => {
  switch (rank) {
    case 0:
      return 'skill-option-untrained';
    case 1:
      return 'skill-option-trained';
    case 2:
      return 'skill-option-expert';
    case 3:
      return 'skill-option-master';
    case 4:
      return 'skill-option-legendary';
    default:
      return '';
  }
};

const stripParagraphTags = (html) => html?.replace(/^<p>|<\/p>$/g, '') || '';

/** FOUNDRY */
export const confirmChanges = async () => {
  return Dialog.confirm({
    title: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.menu.confirmDialog.title'),
    content: `<p>${game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.menu.confirmDialog.content'
    )}</p>`
  });
};

export const createGlobalLevelMessage = (
  actorName,
  targetLevel,
  selectedFeats,
  skillIncreaseMessage
) => {
  const globalMessage = `
  <h2>${game.i18n.format('PF2E_LEVEL_UP_WIZARD.messages.global.header', {
    actorName,
    targetLevel
  })}</h2>
  <p><strong>${game.i18n.localize(
    'PF2E_LEVEL_UP_WIZARD.messages.global.feats'
  )}</strong> ${
    selectedFeats ||
    `${game.i18n.localize('PF2E_LEVEL_UP_WIZARD.messages.global.noFeats')}`
  }</p>
  ${
    skillIncreaseMessage
      ? `<p><strong>${game.i18n.localize(
          'PF2E_LEVEL_UP_WIZARD.messages.global.skills'
        )}</strong> ${skillIncreaseMessage}</p>`
      : ''
  }
`;
  ChatMessage.create({
    content: globalMessage,
    speaker: { alias: actorName }
  });
};

export const createPersonalLevelMessage = (formData, playerId, actorName) => {
  const manualUpdates = [];
  if (formData.spellcasting) {
    manualUpdates.push(
      formData.newSpellRankLevel
        ? game.i18n.localize('PF2E_LEVEL_UP_WIZARD.messages.personal.spellRank')
        : game.i18n.localize(
            'PF2E_LEVEL_UP_WIZARD.messages.personal.spellSlots'
          )
    );
  }

  if (manualUpdates.length > 0) {
    const whisperMessage = `
      <h2>${game.i18n.format('PF2E_LEVEL_UP_WIZARD.messages.personal.header', {
        actorName
      })}</h2>
      <ul>${manualUpdates.map((update) => `<li>${update}</li>`).join('')}</ul>
    `;

    const whisperRecipients = [playerId];

    if (game.settings.get(module_name, 'send-gm-whispers')) {
      const gmUsers = game.users.filter((user) => user.isGM);
      whisperRecipients.push(...gmUsers.map((user) => user.id));
    }

    ChatMessage.create({
      content: whisperMessage,
      whisper: whisperRecipients,
      speaker: { alias: actorName }
    });
  }
};

export const getClassJournal = async (actor) => {
  const characterClass = actor?.class?.name.toLowerCase();

  const classesJournal = game.packs
    .get('pf2e.journals')
    ?.index.find((entry) => entry.name === 'Classes');

  const classesJournalEntry = await fromUuid(classesJournal.uuid);

  const classSpecificJournal = classesJournalEntry.pages.contents.find(
    (page) => page.name.toLowerCase() === characterClass
  );

  return classSpecificJournal;
};

/** FEATS */
const filterFeats = async (searchQuery, targetLevel, existingFeats) => {
  const feats = await getCachedFeats();
  const normalizedQuery = normalizeString(searchQuery);

  return feats.filter((feat) => {
    const traits = feat.system.traits.value.map(normalizeString);
    const isTaken = existingFeats.includes(feat.name.toLowerCase());
    const maxTakable = feat.system.maxTakable;

    return (
      traits.includes(normalizedQuery) &&
      feat.system.level.value <= targetLevel &&
      !(isTaken && maxTakable === 1)
    );
  });
};

const sortFeats = (feats, method) => {
  switch (method) {
    case 'LEVEL_ASC': // Sort by level (Low to High)
      return feats.sort((a, b) =>
        a.system.level.value !== b.system.level.value
          ? a.system.level.value - b.system.level.value
          : a.name.localeCompare(b.name)
      );
    case 'ALPHABETICAL': // Sort alphabetically (A-Z)
      return feats.sort((a, b) => a.name.localeCompare(b.name));
    case 'LEVEL_DESC': // Sort by level (High to Low)
    default:
      return feats.sort((a, b) =>
        a.system.level.value !== b.system.level.value
          ? b.system.level.value - a.system.level.value
          : a.name.localeCompare(b.name)
      );
  }
};

export const getFeatsForLevel = async (
  characterData,
  type,
  targetLevel,
  includeArchetypeFeats = false
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
    class: characterData?.class?.name,
    ancestry: characterData?.ancestry?.name,
    ancestryParagon: characterData?.ancestry?.name,
    general: 'general',
    skill: 'skill',
    archetype: 'archetype'
  };

  const searchQuery = queryMap[type];
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

/** FEATURES */
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

/** SKILLS */
export const getMaxSkillProficiency = (level) => {
  if (level >= 15) return 4; // Legendary
  if (level >= 7) return 3; // Master
  return 2; // Expert
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

export const getSkillsForLevel = (characterData, targetLevel) => {
  const levelsArray = characterData?.class?.system?.skillIncreaseLevels?.value;

  if (!levelsArray.includes(targetLevel)) return [];

  const maxProficiency = getMaxSkillProficiency(targetLevel);

  return Object.values(characterData?.skills)
    .filter((skill) => skill.rank < maxProficiency)
    .map((skill) => ({ ...skill, class: getSkillRankClass(skill.rank) }));
};

/** FORM HANDLERS */
export const attachValidationHandlers = (
  form,
  submitButton,
  attributeButtons,
  selectedBoosts
) => {
  const validateForm = () => {
    const requiredFields = form.find('[data-required="true"]');
    const allRequiredValid = Array.from(requiredFields).every(
      (field) => field.value.trim() !== ''
    );

    const boostsValid = attributeButtons.length
      ? selectedBoosts.size === 4
      : true;

    const allValid = allRequiredValid && boostsValid;

    submitButton.prop('disabled', !allValid);
  };

  validateForm();

  form.on('change', '[data-required="true"]', validateForm);

  return validateForm;
};

export const attachAttributeBoostHandlers = (
  attributeButtons,
  selectedBoosts,
  validateForm,
  partialBoosts
) => {
  const updateButtonStates = () => {
    attributeButtons.each((_, buttonElement) => {
      const button = $(buttonElement);
      const attribute = button.data('value');
      const isSelected = selectedBoosts.has(attribute);

      const partialBoostEntry = partialBoosts.find(
        (boost) => boost.key === attribute
      );
      const isPartial = partialBoostEntry?.isPartial || false;

      const modifierElement = $(`#modifier-${attribute}`);
      const currentModifier = parseInt(modifierElement.text(), 10);

      if (isSelected && !button.hasClass('updated')) {
        button.html(
          `<span class="boost-text">${
            isPartial
              ? game.i18n.localize(
                  'PF2E_LEVEL_UP_WIZARD.menu.attributeBoosts.partial'
                )
              : game.i18n.localize(
                  'PF2E_LEVEL_UP_WIZARD.menu.attributeBoosts.boost'
                )
          }</span>`
        );
        button.toggleClass('partial', isPartial);

        const newModifier = isPartial ? currentModifier : currentModifier + 1;
        modifierElement.text(
          newModifier >= 0 ? `+${newModifier}` : newModifier
        );
        button.addClass('updated');
      } else if (!isSelected && button.hasClass('updated')) {
        button.html(
          `<span class="boost-text">${game.i18n.localize(
            'PF2E_LEVEL_UP_WIZARD.menu.attributeBoosts.boost'
          )}</span>`
        );
        button.removeClass('partial');

        const newModifier = isPartial ? currentModifier : currentModifier - 1;
        modifierElement.text(
          newModifier >= 0 ? `+${newModifier}` : newModifier
        );
        button.removeClass('updated');
      } else {
        modifierElement.text(
          currentModifier >= 0 ? `+${currentModifier}` : currentModifier
        );
      }

      if (selectedBoosts.size >= 4 && !isSelected) {
        button.prop('disabled', true);
      } else {
        button.prop('disabled', false);
      }
    });
  };

  attributeButtons.on('click', (event) => {
    const button = $(event.currentTarget);
    const attribute = button.data('value');

    if (selectedBoosts.has(attribute)) {
      selectedBoosts.delete(attribute);
      button.removeClass('selected');
    } else if (selectedBoosts.size < 4) {
      selectedBoosts.add(attribute);
      button.addClass('selected');
    }

    updateButtonStates();
    validateForm();
  });

  updateButtonStates();
};

export const attachArchetypeCheckboxHandler = (
  archetypeCheckbox,
  reRenderCallback
) => {
  archetypeCheckbox.on('change', (event) => {
    reRenderCallback(event.target.checked);
  });
};
