// Types pour l'éditeur de JSON Schema
export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'select';

export type SelectOption = {
  key: string;
  value: string;
};

export type SchemaProperty = {
  name: string;
  type: JsonSchemaType;
  required: boolean;
  description: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  selectOptions?: SelectOption[];
  format?: 'email' | 'date' | 'uri' | 'datetime-local';
  
  // Propriétés imbriquées pour objects
  properties?: SchemaProperty[];
  
  // Configuration pour arrays
  items?: {
    type: JsonSchemaType;
    properties?: SchemaProperty[];
  };
  
  // Métadonnées pour l'interface
  isExpanded?: boolean;
  level?: number;
  id?: string; // ID unique pour chaque propriété
};

export type SchemaInfo = {
  name: string;
  title: string;
  description: string;
  type: 'object' | 'array';
};

export type JsonSchemaOutput = {
  type: string;
  title?: string;
  description?: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  version?: string;
};

export type VersionInfo = {
  version: string;
  createdAt: string;
  changeType: 'major' | 'minor';
  changeDescription: string;
  previousVersion?: string;
};

export type VersionedSchema = {
  id: string;
  name: string;
  version: string;
  schema: JsonSchemaOutput;
  versionInfo: VersionInfo;
  createdAt: string;
  updatedAt: string;
  versions?: VersionInfo[];
};

export type SchemaEditorState = {
  schemaInfo: SchemaInfo;
  properties: SchemaProperty[];
  isValid: boolean;
  errors: string[];
};

// Types additionnels pour la compatibilité
export type JsonSchema = {
  id?: string;
  name: string;
  title?: string;
  description?: string;
  type: JsonSchemaType;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  additionalProperties?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Entity = {
  id: string;
  schemaId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  version?: number;
};

export type AvailableSchema = {
  id: string;
  name: string;
  title?: string;
  description?: string;
  version?: string;
};