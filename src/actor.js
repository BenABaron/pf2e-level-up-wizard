import { module_name } from './main.js';
import { PF2eLevelUpWizardConfig } from './levelUpWizard.js';

export const renderLevelUpButton = (sheet, html) => {
  if (!sheet.actor.isOwner) return;

  const title = game.i18n.localize('PF2E_LEVEL_UP_WIZARD.button-tooltip');

  html.find('.level-up-icon-button').remove();
  html.find('.level-up-wizard').remove();

  if (
    // prettier-ignore
    game.settings.get(module_name, 'button-placement') === 'CHAR_HEADER_SMALL' ||
    game.settings.get(module_name, 'button-placement') === 'CHAR_HEADER'
  ) {
    const isSmall =
      game.settings.get(module_name, 'button-placement') ===
      'CHAR_HEADER_SMALL';
    const buttonSizeClass = isSmall
      ? 'level-up-icon-button-small'
      : 'level-up-icon-button-large';

    const button = $(
      `<button type='button' class='level-up-icon-button ${buttonSizeClass} flex0' title="${title}">
        <i class='fas fa-hat-wizard'></i>
      </button>`
    );

    button.on('click', () =>
      new PF2eLevelUpWizardConfig(sheet.actor).render(true)
    );

    html.find('section.char-level').prepend(button);
  }

  if (game.settings.get(module_name, 'button-placement') === 'WINDOW_HEADER') {
    const button = $(
      `<a class="level-up-wizard" title="Level Up Wizard"><i class="fas fa-hat-wizard"></i>${title}</a>`
    );

    button.on('click', () =>
      new PF2eLevelUpWizardConfig(sheet.actor).render(true)
    );

    html.find('.window-title').after(button);
  }

  if (game.settings.get(module_name, 'disable-level-input')) {
    const levelInput = html
      .find('.char-header')
      .find('input[name="system.details.level.value"]');

    levelInput.prop('disabled', true);
  }
};

export const renderWizardOnLevelUp = (actor, updateData, options, userId) => {
  if (actor.type !== 'character' || game.user.id !== userId) return;

  const newLevel = updateData?.system?.details?.level?.value;

  if (!newLevel) return;

  ui.notifications.info(
    game.i18n.localize('PF2E_LEVEL_UP_WIZARD.notifications.wizardStartup')
  );

  new PF2eLevelUpWizardConfig(actor, true).render(true);
};
