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

    this.filteredFeats.forEach((feat) => {
      const featElement = $(`
        <div class="feat-option" data-uuid="${feat.uuid}">
          <strong>${feat.name}</strong> (Level ${feat.system.level.value})
        </div>
      `);
      listContainer.append(featElement);
    });
  }

  selectFeat(uuid) {
    const selectedFeat = this.allFeats.find((feat) => feat.uuid === uuid);

    if (!selectedFeat) {
      console.error(`Feat with UUID ${uuid} not found.`);
      return;
    }

    // Update UI to reflect the selected feat
    const toggleButton = this.container.querySelector('.feat-selector-toggle');
    toggleButton.textContent = `${selectedFeat.name} (Level ${selectedFeat.system.level.value})`;

    // Optionally close the menu
    const menu = this.container.querySelector('.feat-selector-menu');
    menu.classList.add('hidden');

    console.log('Selected Feat:', selectedFeat);

    // Trigger any additional logic, e.g., updating actor data
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
        const target = event.target.closest('.feat-option');
        if (target) {
          this.selectFeat(target.dataset.uuid);
        }
      });
  }

  updateFilteredFeats() {
    // Apply filters
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

    // Apply sorting
    this.sortFeats();

    // Re-render the list
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
