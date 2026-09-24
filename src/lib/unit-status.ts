export const isActiveRecord = (record: any) => {
  const status = record?.status;

  if (status === null || status === undefined || status === "") return true;

  const normalized = String(status).trim().toLowerCase();
  return ["ativa", "ativo", "active", "enabled", "disponivel", "disponível"].includes(normalized);
};

export const filterActiveRecords = <T extends Record<string, any>>(records: T[] = []) =>
  records.filter((record) => isActiveRecord(record));
