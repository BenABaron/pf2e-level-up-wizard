import { PF2eLevelUpWizardConfig } from '../levelUpWizard.js';
import { module_name } from '../main.js';
import { capitalize } from './utility.js';

export const renderWizard = (actor, manualLevelUp) => {
  if (validateActor(actor)) {
    new PF2eLevelUpWizardConfig(actor, manualLevelUp).render(true);
  }
};

export const validateActor = (actor) => {
  if (!actor.class) {
    ui.notifications.error(
      game.i18n.localize('PF2E_LEVEL_UP_WIZARD.notifications.missingClass')
    );
    return false;
  }
  // If the actor has a dual class translated with babele, there seems to be no way to properly filter the class feats
  if (
    actor.class.flags.babele?.translated &&
    actor.class.name.indexOf('-') > -1
  ) {
    ui.notifications.error(
      game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.notifications.translatedDualClassError'
      )
    );
    return false;
  }
  return true;
};

export const confirmChanges = async () => {
  return foundry.applications.api.DialogV2.confirm({
    window: {
      title: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.menu.confirmDialog.title')
    },
    content: `<p>${game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.menu.confirmDialog.content'
    )}</p>`,
    modal: true
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

  if (
    formData.attributes.find(
      (attribute) => attribute.key === 'int' && attribute.isPartial === false
    )
  ) {
    manualUpdates.push(
      game.i18n.localize('PF2E_LEVEL_UP_WIZARD.messages.personal.intIncrease')
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

  if (!characterClass) return null;

  const classNames = characterClass.includes('-')
    ? characterClass
        .split('-')
        .map((className) => className.trim().toLowerCase())
    : [characterClass];

  const classesJournal = game.packs
    .get('pf2e.journals')
    ?.index.find((entry) => entry.name === 'Classes');

  if (!classesJournal) return null;

  const classesJournalEntry = await fromUuid(classesJournal.uuid);

  const classSpecificJournals = classNames.map((className) =>
    classesJournalEntry.pages.contents.find(
      (page) => page.name.toLowerCase() === className
    )
  );

  const validJournals = classSpecificJournals.filter(Boolean);

  return validJournals;
};

export const createFeatChatMessage = (feat) => {
  const actorId = game.user.character?.id;
  const itemId = feat._id;
  const traits = feat.system.traits.value || [];
  const rarity = feat.system.traits.rarity || 'common';

  const getActionGlyph = (actionType, actions) => {
    if (actionType === 'passive') return '';

    let glyphValue;

    switch (actionType) {
      case 'reaction':
        glyphValue = 'R';
        break;
      case 'free':
        glyphValue = 'F';
        break;
      case 'action':
        glyphValue = actions;
        break;
      default:
        glyphValue = '';
    }

    return glyphValue ? `<span class="action-glyph">${glyphValue}</span>` : '';
  };

  const actionGlyph = getActionGlyph(
    feat.system.actionType?.value,
    feat.system.actions?.value
  );

  const getRarityTag = (rarity) => {
    if (rarity !== 'common') {
      return `<span class="tag rarity ${rarity}" data-trait="${rarity}" data-tooltip="PF2E.TraitDescription${capitalize(
        rarity
      )}">${capitalize(rarity)}</span>`;
    }
    return '';
  };

  const rarityTag = getRarityTag(rarity);

  const traitsTags = traits
    .map(
      (trait) =>
        `<span class="tag" data-trait data-tooltip="PF2E.TraitDescription${capitalize(
          trait
        )}">${capitalize(trait)}</span>`
    )
    .join('');

  const chatContent = `
    <div class="pf2e chat-card item-card" data-actor-id="${actorId}" data-item-id="${itemId}">
        <header class="card-header flexrow">
            <img src="${feat.img}" alt="${feat.name}" />
            <h3>${feat.name} ${actionGlyph}</h3>
        </header>

        <div class="tags paizo-style" data-tooltip-class="pf2e">
            ${rarityTag}
            ${traitsTags}
        </div>

        <div class="card-content">
            ${feat.system.description.value}
        </div>

        <footer>
            <span>${game.i18n.localize(
              'PF2E_LEVEL_UP_WIZARD.messages.global.feat'
            )} ${feat.system.level.value}</span>
        </footer>
    </div>
  `;

  ChatMessage.create({
    user: game.user.id,
    content: chatContent
  });
};
