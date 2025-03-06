import { renderLevelUpButton, renderWizardOnLevelUp } from './actor.js';
import { registerSettings } from './settings.js';

export const module_name = 'pf2e-level-up-wizard';

Hooks.on('init', async () => {
  console.log('PF2e Level-Up Wizard | Module Initialized');
  registerSettings();

  Handlebars.registerHelper('notEqual', (a, b) => a !== b);
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('or', (...args) => {
    const options = args.pop();
    return args.some(Boolean);
  });
});

Hooks.on('ready', () => {
  const showButton = game.settings.get(module_name, 'show-level-up-button');
  const hook = showButton ? 'renderCharacterSheetPF2e' : 'updateActor';
  const handler = showButton ? renderLevelUpButton : renderWizardOnLevelUp;

  Hooks.on(hook, handler);
});

document.addEventListener('change', (event) => {
  if (
    event.target.matches([
      '#skills',
      '#newPotency',
      '#upgradePotencyTo2',
      '#upgradePotencyTo3'
    ])
  ) {
    const selectElement = event.target;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const selectedClass = selectedOption.className;

    selectElement.classList.remove(
      'skill-option-untrained',
      'skill-option-trained',
      'skill-option-expert',
      'skill-option-master',
      'skill-option-legendary'
    );

    if (selectedClass) {
      selectElement.classList.add(selectedClass);
    }
  }
});
