import { capitalize } from './helpers/utility.js';
import { module_name } from './main.js';

export class FeatSelector {
  constructor(container, feats) {
    this.container = container;
    this.allFeats = feats;
    this.filteredFeats = [...feats];

    const defaultSort = game.settings.get(module_name, 'feat-sort-method');
    const [sortMethod, sortOrder] = defaultSort.toLowerCase().split('_');

    this.filters = {
      minLevel: null,
      maxLevel: null,
      search: '',
      sortMethod: sortMethod,
      sortOrder: sortOrder
    };

    this.init();
  }

  init() {
    this.updateFilteredFeats();

    this.render();

    this.attachEventListeners();
  }

  render() {
    const listContainer = $(this.container).find('.feat-list');
    listContainer.empty();

    const templatePath = `modules/${module_name}/templates/partials/feat-option.hbs`;

    const showPrerequisites = game.settings.get(
      module_name,
      'show-feat-prerequisites'
    );

    this.filteredFeats.forEach(async (feat) => {
      if (showPrerequisites && feat.system.prerequisites?.value?.length) {
        feat.displayName = `${feat.name}*`;
      } else {
        feat.displayName = feat.name;
      }

      const html = await renderTemplate(templatePath, feat);
      listContainer.append(html);
    });

    const sortDropdown = $(this.container).find('#sort-options');
    sortDropdown.val(this.filters.sortMethod);
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
      menu.toggleClass('hidden');
    });

    // Close menu when clicking outside
    $(document).on('click', (e) => {
      if (!this.container.contains(e.target)) {
        menu.addClass('hidden'); // Ensure the menu is hidden
      }
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
        this.filters.sortMethod = e.target.value;
        this.updateFilteredFeats();
      });

    // Event: Sort
    $(this.container)
      .find('#order-button')
      .on('click', () => {
        if (this.filters.sortOrder === 'desc') {
          this.filters.sortOrder = 'asc';
        } else {
          this.filters.sortOrder = 'desc';
        }
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
    const button = $(this.container).find('#order-button').children('i');

    const iconMapping = {
      'alpha-asc': 'fa-solid fa-sort-alpha-up',
      'alpha-desc': 'fa-solid fa-sort-alpha-down-alt',
      'level-asc': 'fa-solid fa-sort-numeric-up',
      'level-desc': 'fa-solid fa-sort-numeric-down-alt'
    };

    const sortMethod = `${this.filters.sortMethod}-${this.filters.sortOrder}`;

    button.removeClass().addClass(iconMapping[sortMethod] || '');

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
