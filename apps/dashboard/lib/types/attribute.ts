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

export type AttributeValueAdmin = {
  id: number;
  attributeId: number;
  value: string;
  createdAt: string;
  updatedAt: string;
};
