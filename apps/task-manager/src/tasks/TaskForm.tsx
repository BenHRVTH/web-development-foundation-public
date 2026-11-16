import { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Dialog } from '../components/Dialog';
import { TextInput } from '../components/TextInput';
import {
  DESCRIPTION_LIMIT,
  TITLE_LIMIT,
  validateTask,
  type Task,
  type TaskValues,
} from './model';
export interface TaskFormProps {
  task: Task | undefined;
  onSave: (values: TaskValues) => void;
  onClose: () => void;
}
export function TaskForm({ task, onSave, onClose }: TaskFormProps) {
  const initial = {
    title: task?.title ?? '',
    description: task?.description ?? '',
    completed: task?.completed ?? false,
  };
  const [values, setValues] = useState<TaskValues>(initial);
  const [errors, setErrors] = useState({ title: '', description: '' });
  const [discard, setDiscard] = useState(false);
  const titleRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const submitted = useRef(false);
  const keepEditing = useRef<HTMLButtonElement>(null);
  const dirty =
    values.title !== initial.title ||
    values.description !== initial.description ||
    values.completed !== initial.completed;
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  useEffect(() => {
    if (discard) keepEditing.current?.focus();
  }, [discard]);
  function requestClose() {
    if (discard) {
      setDiscard(false);
      titleRef.current?.focus();
    } else if (dirty) setDiscard(true);
    else onClose();
  }
  return (
    <Dialog
      open
      title={task ? 'Feladat szerkesztése' : 'Új feladat'}
      description="Elég egy rövid, konkrét cím. A részleteket később is hozzáadhatod."
      onClose={requestClose}
    >
      <form
        noValidate
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.nativeEvent.isComposing)
            event.preventDefault();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (submitted.current || discard) return;
          const next = validateTask(values);
          setErrors(next);
          if (next.title || next.description) {
            (next.title ? titleRef : descriptionRef).current?.focus();
            return;
          }
          submitted.current = true;
          onSave(values);
        }}
      >
        <TextInput
          label="Feladat neve"
          required
          value={values.title}
          onChange={(event) => {
            setValues({ ...values, title: event.target.value });
            if (errors.title) setErrors({ ...errors, title: '' });
          }}
          error={errors.title}
          hint={`Legfeljebb ${TITLE_LIMIT} karakter.`}
          inputRef={titleRef}
        />
        <TextInput
          label="Leírás"
          multiline
          value={values.description}
          onChange={(event) => {
            setValues({ ...values, description: event.target.value });
            if (errors.description) setErrors({ ...errors, description: '' });
          }}
          error={errors.description}
          hint={`Nem kötelező · legfeljebb ${DESCRIPTION_LIMIT} karakter.`}
          inputRef={descriptionRef}
        />
        <Checkbox
          label="Már elkészült"
          checked={values.completed}
          onChange={(event) =>
            setValues({ ...values, completed: event.target.checked })
          }
        />
        {discard && (
          <div className="discard-prompt" role="alert">
            <p>Elveted a nem mentett módosításokat?</p>
            <div className="form-actions">
              <Button
                ref={keepEditing}
                variant="secondary"
                onClick={() => {
                  setDiscard(false);
                  titleRef.current?.focus();
                }}
              >
                Folytatom a szerkesztést
              </Button>
              <Button variant="quiet" onClick={onClose}>
                Módosítások elvetése
              </Button>
            </div>
          </div>
        )}
        <div className="form-actions">
          <Button variant="secondary" onClick={requestClose}>
            Mégse
          </Button>
          <Button
            type="submit"
            disabled={discard}
            icon={task ? <Check /> : <Plus />}
          >
            {task ? 'Módosítások mentése' : 'Feladat létrehozása'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
