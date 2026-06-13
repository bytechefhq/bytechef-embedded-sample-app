'use client';

import {useEffect, useState} from 'react';
import {ComponentConnection, fetchComponentConnections} from '@/lib/api';
import {ComponentName} from '../catalog';

interface ConnectionPickerProps {
  componentName: ComponentName;
  connectionId?: number;
  onChange: (connectionId: number | undefined) => void;
}

export default function ConnectionPicker({componentName, connectionId, onChange}: ConnectionPickerProps) {
  const [connections, setConnections] = useState<ComponentConnection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setConnections(null);
    setError(null);

    fetchComponentConnections(componentName)
      .then((data) => {
        if (active) {
          setConnections(data);
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not load connections');
        }
      });

    return () => {
      active = false;
    };
  }, [componentName]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">Connection</label>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={connectionId ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
      >
        <option value="">No connection</option>

        {(connections ?? []).map((connection) => (
          <option key={connection.id} value={connection.id}>
            {connection.name}
          </option>
        ))}
      </select>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && connections !== null && connections.length === 0 ? (
        <p className="text-xs text-muted-foreground">No existing connections for this component.</p>
      ) : null}
    </div>
  );
}
