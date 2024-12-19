import { renderLevelUpButton, renderWizardOnLevelUp } from './actor.js';
import { registerSettings } from './settings.js';

export const module_name = 'pf2e-level-up-wizard';

Hooks.on('init', async () => {
  console.log('PF2e Level-Up Wizard | Module Initialized');
  registerSettings();

  const featDropdownPath = `modules/${module_name}/templates/partials/feat-dropdown.hbs`;
  const featDropdownTemplate = await getTemplate(featDropdownPath);
  Handlebars.registerPartial('featDropdown', featDropdownTemplate);
});

Hooks.on('ready', () => {
  const showButton = game.settings.get(module_name, 'show-level-up-button');
  const hook = showButton ? 'renderCharacterSheetPF2e' : 'updateActor';
  const handler = showButton ? renderLevelUpButton : renderWizardOnLevelUp;

  Hooks.on(hook, handler);
});

document.addEventListener('change', (event) => {
  if (event.target.matches('#skills')) {
    const selectElement = event.target;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const selectedClass = selectedOption.className;

    // Remove previous skill rank classes
    selectElement.classList.remove(
      'skill-option-untrained',
      'skill-option-trained',
      'skill-option-expert',
      'skill-option-master',
      'skill-option-legendary'
    );

    // Add the class of the selected option
    if (selectedClass) {
      selectElement.classList.add(selectedClass);
    }
  }
});
