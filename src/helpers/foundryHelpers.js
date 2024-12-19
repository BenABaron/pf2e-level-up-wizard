import { module_name } from '../main.js';

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
