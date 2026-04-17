export type AttributeValue = {
  id: number;
  value: string;
};

export type Attribute = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  values: AttributeValue[];
};

export type AttributeListItem = {
  id: number;
  name: string;
  valueCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AttributeListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AttributeListResponse = {
  data: AttributeListItem[];
  meta: AttributeListMeta;
};

export type AttributeValueAdmin = {
  id: number;
  attributeId: number;
  value: string;
  createdAt: string;
  updatedAt: string;
};
