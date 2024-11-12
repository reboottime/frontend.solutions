## README

<context>

<requirements>
I  expect you to build a form buidler, using it people can

- Dynamic field addition/removal with different types (text, select, number, time)
- Real-time form preview
- Validation rules builder
- State persistence between preview/edit modes
- Handle field dependencies
- Support for default values and conditional logic
- user can redo/undo

the  api contract is as below
```tsx
```typescript
type FieldType = 'text' | 'select' | 'number' | 'time' | 'boolean';

type Field = {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  validation?: ValidationRule[];
  dependsOn?: {
    fieldId: string;
    condition: string;
    value: any;
  };
};

type Form = {
  id: string;
  name: string;
  fields: Field[];
  version: number;
};
```p
we do not build nested form fields

For the redo/undo interaction, The form building process can be derived by historical commands. one idea you can learn from is craft.js, if you have craft.js codebase in your memory.

Please think step by step and take my requirments in mind.

</requirements>
<your_role>
  your role in this conversation is a staff eng who is good at architecturing, who can design the state wisely and keep the memory lean and app performant.
</your_role>

</context>
<response>
Please respond code in tyescript, and add  line break between varaible concepts
</response>