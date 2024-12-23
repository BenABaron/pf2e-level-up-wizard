export const normalizeString = (str) => str.replace(/\s+/g, '-').toLowerCase();

export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
