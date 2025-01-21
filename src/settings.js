import { module_name } from './main.js';
import { renderLevelUpButton } from './actor.js';

const rerenderCharacterSheet = () => {
  Object.values(ui.windows).forEach((app) => {
    if (
      app.options.classes.includes('character') &&
      app.actor?.type === 'character'
    ) {
      app.render(false);

      const html = $(app.element);
      renderLevelUpButton(app, html);
    }
  });
};

export const registerSettings = () => {
  game.settings.register(module_name, 'show-level-up-button', {
    name: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.settings.showButton.name'),
    hint: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.settings.showButton.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register(module_name, 'button-placement', {
    name: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.buttonPlacement.name'
    ),
    hint: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.buttonPlacement.hint'
    ),
    scope: 'client',
    config: true,
    type: String,
    default: 'CHAR_HEADER_SMALL',
    choices: {
      CHAR_HEADER: game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.settings.buttonPlacement.options.charHeaderLarge'
      ),
      CHAR_HEADER_SMALL: game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.settings.buttonPlacement.options.charHeaderSmall'
      ),
      WINDOW_HEADER: game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.settings.buttonPlacement.options.windowHeader'
      )
    },
    onChange: rerenderCharacterSheet
  });

  game.settings.register(module_name, 'feat-sort-method', {
    name: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.settings.sortMethod.name'),
    hint: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.settings.sortMethod.hint'),
    scope: 'client',
    config: true,
    default: 'LEVEL_DESC',
    choices: {
      LEVEL_DESC: game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.settings.sortMethod.options.levelDesc'
      ),
      LEVEL_ASC: game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.settings.sortMethod.options.levelAsc'
      ),
      ALPHA_DESC: game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.settings.sortMethod.options.alphaDesc'
      ),
      ALPHA_ASC: game.i18n.localize(
        'PF2E_LEVEL_UP_WIZARD.settings.sortMethod.options.alphaAsc'
      )
    }
  });

  game.settings.register(module_name, 'show-feat-prerequisites', {
    name: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.settings.featPrereqs.name'),
    hint: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.settings.featPrereqs.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      Object.values(ui.windows).forEach((app) => {
        if (app.options.id === 'level-up-wizard') {
          app.render(true);
        }
      });
    }
  });

  game.settings.register(module_name, 'disable-level-input', {
    name: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.disableLevelInput.name'
    ),
    hint: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.disableLevelInput.hint'
    ),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: rerenderCharacterSheet
  });

  game.settings.register(module_name, 'send-gm-whispers', {
    name: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.sendGMWhispers.name'
    ),
    hint: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.sendGMWhispers.hint'
    ),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(module_name, 'additional-feat-compendiums', {
    name: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.additionalCompendiums.name'
    ),
    hint: game.i18n.localize(
      'PF2E_LEVEL_UP_WIZARD.settings.additionalCompendiums.hint'
    ),
    scope: 'world',
    config: true,
    type: String,
    requiresReload: true
  });
};
