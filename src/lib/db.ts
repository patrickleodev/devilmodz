import AppDataSource from "./data-source";

export const ensureDataSource = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  return AppDataSource;
};

export default ensureDataSource;
