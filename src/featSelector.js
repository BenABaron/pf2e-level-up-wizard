import { capitalize } from './helpers/utility.js';
import { module_name } from './main.js';

export class FeatSelector {
  constructor(container, feats) {
    this.container = container; // The DOM element for this component
    this.allFeats = feats; // The full list of feats
    this.filteredFeats = [...feats]; // Current filtered list
    this.filters = {
      minLevel: null,
      maxLevel: null,
      search: '',
      sort: 'level-desc'
    };

    this.init();
  }

  init() {
    // Render the initial UI
    this.render();

    // Attach event listeners
    this.attachEventListeners();
  }

  render() {
    const listContainer = $(this.container).find('.feat-list');
    listContainer.empty();

    const templatePath = `modules/${module_name}/templates/partials/feat-option.hbs`;

    this.filteredFeats.forEach(async (feat) => {
      const html = await renderTemplate(templatePath, feat);
      listContainer.append(html);
    });
  }

  selectFeat(uuid) {
    const selectedFeat = this.allFeats.find((feat) => feat.uuid === uuid);

    if (!selectedFeat) {
      console.error(`Feat with UUID ${uuid} not found.`);
      return;
    }

    const toggleButton = this.container.querySelector('.feat-selector-toggle');
    toggleButton.textContent = `${selectedFeat.name} (Level ${selectedFeat.system.level.value})`;

    const menu = this.container.querySelector('.feat-selector-menu');
    menu.classList.add('hidden');

    const event = new CustomEvent('featSelected', {
      detail: { id: this.container.dataset.id, selectedFeat }
    });
    this.container.dispatchEvent(event);
  }

  attachEventListeners() {
    const toggleButton = $(this.container).find('.feat-selector-toggle');
    const menu = $(this.container).find('.feat-selector-menu');

    // Toggle menu visibility
    toggleButton.on('click', () => {
      menu.toggleClass('hidden'); // Toggle the 'hidden' class to show/hide the menu
    });

    // Event: Min Level
    $(this.container)
      .find('#min-level')
      .on('input', (e) => {
        this.filters.minLevel = parseInt(e.target.value, 10) || null;
        this.updateFilteredFeats();
      });

    // Event: Max Level
    $(this.container)
      .find('#max-level')
      .on('input', (e) => {
        this.filters.maxLevel = parseInt(e.target.value, 10) || null;
        this.updateFilteredFeats();
      });

    // Event: Search
    $(this.container)
      .find('#search-feats')
      .on('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.updateFilteredFeats();
      });

    // Event: Sort
    $(this.container)
      .find('#sort-options')
      .on('change', (e) => {
        this.filters.sort = e.target.value;
        this.updateFilteredFeats();
      });

    // Event: Select Feat
    $(this.container)
      .find('.feat-list')
      .on('click', (e) => {
        if (
          $(e.target).hasClass('feat-link') ||
          $(e.target).closest('[data-action="send-to-chat"]').length
        ) {
          return;
        }

        const target = e.target.closest('.feat-option');
        if (target) {
          this.selectFeat(target.dataset.uuid);
        }
      });

    $(this.container)
      .find('.feat-list')
      .on('click', '[data-action="send-to-chat"]', async (e) => {
        const container = $(e.currentTarget).closest('.feat-option');
        const uuid = container.data('uuid');
        console.log(container, uuid);
        if (uuid) {
          const feat = await fromUuid(uuid);
          if (feat) {
            const actorId = game.user.character?.id; // If an actor is associated with the user
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

              return glyphValue
                ? `<span class="action-glyph">${glyphValue}</span>`
                : '';
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
                      <span>Feat ${feat.system.level.value}</span>
                  </footer>
              </div>
            `;

            ChatMessage.create({
              user: game.user.id,
              content: chatContent
            });
          }
        }
      });
  }

  updateFilteredFeats() {
    this.filteredFeats = this.allFeats.filter((feat) => {
      const matchesMinLevel =
        this.filters.minLevel === null ||
        feat.system.level.value >= this.filters.minLevel;
      const matchesMaxLevel =
        this.filters.maxLevel === null ||
        feat.system.level.value <= this.filters.maxLevel;
      const matchesSearch = feat.name
        .toLowerCase()
        .includes(this.filters.search);
      return matchesMinLevel && matchesMaxLevel && matchesSearch;
    });

    this.sortFeats();
    this.render();
  }

  sortFeats() {
    const sortMethod = this.filters.sort;

    this.filteredFeats.sort((a, b) => {
      if (sortMethod === 'level-desc')
        return b.system.level.value - a.system.level.value;
      if (sortMethod === 'level-asc')
        return a.system.level.value - b.system.level.value;
      if (sortMethod === 'alpha-asc') return a.name.localeCompare(b.name);
      if (sortMethod === 'alpha-desc') return b.name.localeCompare(a.name);
    });
  }
}
