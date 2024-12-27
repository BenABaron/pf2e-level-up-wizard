export const attachValidationHandlers = (
  form,
  submitButton,
  attributeButtons,
  selectedBoosts,
  requiredFeats,
  allowedBoostsForSet
) => {
  const validateForm = () => {
    const requiredFields = form.find('[data-required="true"]');
    const allRequiredValid = Array.from(requiredFields).every(
      (field) => field.value.trim() !== ''
    );

    const featsValid = requiredFeats.every((featType) => {
      const button = form.find(`#${featType}`); // Use the button's ID
      const featSelected = button.text().trim();
      return featSelected && featSelected !== 'Make a Selection';
    });

    const boostsValid = attributeButtons.length
      ? selectedBoosts.size === allowedBoostsForSet
      : true;

    const allValid = allRequiredValid && boostsValid && featsValid;

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
  partialBoosts,
  allowedBoostsForSet,
  boostsForCurrentSet
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
      const isPreSelected = boostsForCurrentSet.includes(attribute);

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

        const newModifier =
          isPreSelected || isPartial ? currentModifier : currentModifier + 1;
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

        const newModifier =
          isPreSelected || isPartial ? currentModifier : currentModifier - 1;
        modifierElement.text(
          newModifier >= 0 ? `+${newModifier}` : newModifier
        );
        button.removeClass('updated');
      } else {
        modifierElement.text(
          currentModifier >= 0 ? `+${currentModifier}` : currentModifier
        );
      }

      if (
        (selectedBoosts.size >= allowedBoostsForSet && !isSelected) ||
        isPreSelected
      ) {
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

  boostsForCurrentSet.forEach((boost) => {
    selectedBoosts.add(boost);
    const relevantButton = attributeButtons.filter(
      (_, button) => $(button).data('value') === boost
    );
    relevantButton.addClass('selected');
  });

  updateButtonStates();
};
