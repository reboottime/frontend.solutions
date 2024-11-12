import React, { useState, useCallback, useReducer, useRef, useEffect } from 'react';
import { AlertCircle, Plus, Trash2, Undo, Redo } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Mock API
const saveFormDraft = async (form) => new Promise(resolve => setTimeout(() => resolve(form), 500));
const validateField = async (field, value) => new Promise(resolve => 
  setTimeout(() => resolve({ isValid: true, errors: [] }), 200)
);

// Action types
const ActionTypes = {
  ADD_FIELD: 'ADD_FIELD',
  UPDATE_FIELD: 'UPDATE_FIELD',
  DELETE_FIELD: 'DELETE_FIELD'
};

// Simplified state with command pattern
const initialState = {
  fields: [],
  commands: [], // Array of all actions
  currentIndex: -1, // Points to the last executed command
  version: 1
};

const applyCommand = (fields, command) => {
  switch (command.type) {
    case ActionTypes.ADD_FIELD:
      return [...fields, command.field];
    case ActionTypes.UPDATE_FIELD:
      return fields.map(field => 
        field.id === command.field.id ? command.field : field
      );
    case ActionTypes.DELETE_FIELD:
      return fields.filter(field => field.id !== command.fieldId);
    default:
      return fields;
  }
};

const formReducer = (state, action) => {
  switch (action.type) {
    case 'EXECUTE_COMMAND': {
      const newCommands = [
        ...state.commands.slice(0, state.currentIndex + 1),
        action.command
      ];
      const newIndex = state.currentIndex + 1;
      return {
        ...state,
        commands: newCommands,
        currentIndex: newIndex,
        fields: applyCommand(state.fields, action.command),
        version: state.version + 1
      };
    }
    case 'UNDO': {
      if (state.currentIndex < 0) return state;
      return {
        ...state,
        currentIndex: state.currentIndex - 1,
        fields: state.commands
          .slice(0, state.currentIndex)
          .reduce((fields, command) => applyCommand(fields, command), []),
        version: state.version + 1
      };
    }
    case 'REDO': {
      if (state.currentIndex >= state.commands.length - 1) return state;
      const newIndex = state.currentIndex + 1;
      return {
        ...state,
        currentIndex: newIndex,
        fields: applyCommand(state.fields, state.commands[newIndex]),
        version: state.version + 1
      };
    }
    default:
      return state;
  }
};

// Field component remains the same as before
const Field = React.memo(({ field, onChange, onDelete }) => {
  const [value, setValue] = useState(field.value || '');
  
  return (
    <div className="p-4 border rounded-lg bg-white mb-4">
      <div className="flex justify-between items-center mb-2">
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange(field.id, { ...field, label: e.target.value })}
          className="flex-1 p-2 border rounded mr-2"
          placeholder="Field Label"
        />
        <button onClick={() => onDelete(field.id)} className="p-2 text-red-500">
          <Trash2 size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-2">
        <select
          value={field.type}
          onChange={(e) => onChange(field.id, { ...field, type: e.target.value })}
          className="p-2 border rounded"
        >
          <option value="text">Text</option>
          <option value="select">Select</option>
          <option value="number">Number</option>
          <option value="time">Time</option>
          <option value="boolean">Boolean</option>
        </select>

        {field.type === 'select' && (
          <input
            type="text"
            placeholder="Options (comma-separated)"
            className="p-2 border rounded"
            onChange={(e) => onChange(field.id, { 
              ...field, 
              options: e.target.value.split(',').map(opt => opt.trim())
            })}
          />
        )}
      </div>
    </div>
  );
});

const FormBuilder = () => {
  const [formState, dispatch] = useReducer(formReducer, initialState);
  const debouncedSaveRef = useRef();

  const executeCommand = useCallback((command) => {
    dispatch({ type: 'EXECUTE_COMMAND', command });
  }, []);

  const actions = {
    addField: useCallback(() => {
      const command = {
        type: ActionTypes.ADD_FIELD,
        field: {
          id: Date.now().toString(),
          type: 'text',
          label: '',
          required: false
        }
      };
      executeCommand(command);
    }, [executeCommand]),

    updateField: useCallback((fieldId, updates) => {
      const command = {
        type: ActionTypes.UPDATE_FIELD,
        field: updates
      };
      executeCommand(command);

      // Debounced save
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }
      debouncedSaveRef.current = setTimeout(() => {
        saveFormDraft({ fields: formState.fields, version: formState.version });
      }, 1000);
    }, [executeCommand, formState.fields, formState.version]),

    deleteField: useCallback((fieldId) => {
      const command = {
        type: ActionTypes.DELETE_FIELD,
        fieldId
      };
      executeCommand(command);
    }, [executeCommand]),

    undo: useCallback(() => {
      dispatch({ type: 'UNDO' });
    }, []),

    redo: useCallback(() => {
      dispatch({ type: 'REDO' });
    }, [])
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            actions.redo();
          } else {
            actions.undo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [actions]);

  const canUndo = formState.currentIndex >= 0;
  const canRedo = formState.currentIndex < formState.commands.length - 1;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Form Builder</h1>
        <div className="flex gap-2">
          <button
            onClick={actions.undo}
            className="p-2 border rounded hover:bg-gray-100"
            disabled={!canUndo}
            title="Undo (Ctrl/Cmd + Z)"
          >
            <Undo size={20} />
          </button>
          <button
            onClick={actions.redo}
            className="p-2 border rounded hover:bg-gray-100"
            disabled={!canRedo}
            title="Redo (Ctrl/Cmd + Shift + Z)"
          >
            <Redo size={20} />
          </button>
          <button
            onClick={actions.addField}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={20} />
            Add Field
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {formState.fields.map(field => (
            <Field
              key={field.id}
              field={field}
              onChange={actions.updateField}
              onDelete={actions.deleteField}
            />
          ))}
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <div className="mb-4 text-sm text-gray-500">
            Command History: {formState.currentIndex + 1}/{formState.commands.length}
          </div>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(formState.fields, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;