export const isActiveRecord = (record: any) => {
  const status = record?.status;

  if (status === null || status === undefined || status === "") return true;

  const normalized = String(status).trim().toLowerCase();
  return normalized === "ativa" || normalized === "active" || normalized === "ativo" || normalized === "enabled";
};

export const filterActiveRecords = <T extends Record<string, any>>(records: T[] = []) =>
  records.filter((record) => isActiveRecord(record));
