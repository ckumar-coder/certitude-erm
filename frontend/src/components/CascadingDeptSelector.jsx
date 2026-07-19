// CascadingDeptSelector.jsx
//
// Handles two modes based on activeCompany.has_business_units:
//
//   BU Mode    — BU picker → dept picker filtered to that BU
//   Simple Mode — flat dept picker with sub-depts indented under their parent
//
// Props:
//   value        : dept code (string) — the selected dept code
//   onChange     : (deptCode: string) => void
//   departments  : array of dept objects from GET /api/departments
//                  (must include business_unit_id, parent_dept_id)
//   bus          : array of BU objects from GET /api/business-units (BU Mode only)
//   isBuMode     : boolean
//   required     : boolean (optional)
//   disabled     : boolean (optional)
//   placeholder  : string (optional, defaults vary by mode)
//   label        : string (optional — if provided, wraps in a labeled form-group)
//   allowEmpty   : boolean — show an "Enterprise-wide" empty option (default true)
//   twoFields    : boolean — BU Mode only: render BU + Dept as two separate labeled
//                  form-groups (a React fragment) instead of one inline row.
//                  The parent must NOT wrap this in its own form-group when twoFields=true.

import { useState, useEffect } from 'react';

export default function CascadingDeptSelector({
    value,
    onChange,
    departments = [],
    bus = [],
    isBuMode = false,
    required = false,
    disabled = false,
    placeholder,
    label,
    deptLabel = 'Department',
    allowEmpty = true,
    twoFields = false,
}) {
    // BU Mode: track which BU is selected to filter depts
    const [selectedBuId, setSelectedBuId] = useState('');

    // When value changes externally (e.g. form reset), sync the BU picker.
    // Do NOT clear selectedBuId when value is cleared — that happens when
    // handleBuChange calls onChange(''), which would immediately deselect the BU.
    useEffect(() => {
        if (!isBuMode) { setSelectedBuId(''); return; }
        if (!value) return; // dept cleared: keep the BU selection intact
        const dept = departments.find((d) => d.code === value);
        if (dept?.business_unit_id) {
            setSelectedBuId(String(dept.business_unit_id));
        }
    }, [value, isBuMode, departments]);

    if (isBuMode) {
        // Depts available for the selected BU
        const deptsForBu = selectedBuId
            ? departments.filter((d) => String(d.business_unit_id) === selectedBuId)
            : departments;

        function handleBuChange(e) {
            setSelectedBuId(e.target.value);
            // Clear dept selection if it's not under the new BU
            if (value) {
                const currentDept = departments.find((d) => d.code === value);
                if (!currentDept || String(currentDept.business_unit_id) !== e.target.value) {
                    onChange('');
                }
            }
        }

        // twoFields: render Business Unit + Department as two separate labeled form-groups
        if (twoFields) {
            return (
                <>
                    <div className="form-group">
                        <label>Business Unit</label>
                        <select
                            className="form-control"
                            value={selectedBuId}
                            onChange={handleBuChange}
                            disabled={disabled}
                        >
                            <option value="">— Select BU —</option>
                            {bus.map((b) => (
                                <option key={b.id} value={String(b.id)}>{b.name} ({b.code})</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>{deptLabel}</label>
                        <select
                            className="form-control"
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            required={required}
                            disabled={disabled || (!selectedBuId && !allowEmpty)}
                        >
                            <option value="">— {selectedBuId ? (placeholder || 'Select department') : 'Select BU first'} —</option>
                            {deptsForBu.map((d) => (
                                <option key={d.id} value={d.code}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </>
            );
        }

        const inner = (
            <div style={{ display: 'flex', gap: 8 }}>
                {/* BU picker */}
                <select
                    className="form-control"
                    value={selectedBuId}
                    onChange={handleBuChange}
                    disabled={disabled}
                    style={{ flex: '0 0 45%' }}
                >
                    <option value="">— Select BU —</option>
                    {bus.map((b) => (
                        <option key={b.id} value={String(b.id)}>{b.name} ({b.code})</option>
                    ))}
                </select>

                {/* Dept picker */}
                <select
                    className="form-control"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={disabled || (!selectedBuId && !allowEmpty)}
                    style={{ flex: '1 1 auto' }}
                >
                    {allowEmpty && <option value="">— {placeholder || (selectedBuId ? 'Select department' : 'Select BU first')} —</option>}
                    {deptsForBu.map((d) => (
                        <option key={d.id} value={d.code}>{d.name}</option>
                    ))}
                </select>
            </div>
        );

        if (label) {
            return (
                <div className="form-group">
                    <label>{label}</label>
                    {inner}
                </div>
            );
        }
        return inner;
    }

    // Simple Mode — flat list with sub-depts visually grouped/indented
    // Sort: top-level depts first, sub-depts immediately after their parent
    const topLevel = departments.filter((d) => !d.parent_dept_id);
    const subDepts = departments.filter((d) => !!d.parent_dept_id);

    // Build ordered list: parent → its sub-depts → next parent → ...
    const ordered = [];
    for (const p of topLevel) {
        ordered.push({ ...p, isParent: true });
        for (const s of subDepts.filter((d) => String(d.parent_dept_id) === String(p.id))) {
            ordered.push({ ...s, isParent: false, parentName: p.name });
        }
    }
    // Any orphaned sub-depts (parent not in list) go at the end
    const parentIds = new Set(topLevel.map((d) => String(d.id)));
    for (const s of subDepts.filter((d) => !parentIds.has(String(d.parent_dept_id)))) {
        ordered.push({ ...s, isParent: false });
    }

    const hasSubDepts = subDepts.length > 0;

    const inner = (
        <select
            className="form-control"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
        >
            {allowEmpty && (
                <option value="">— {placeholder || 'Select department'} —</option>
            )}
            {hasSubDepts ? (
                // Group with optgroups if there are sub-depts
                topLevel.map((p) => {
                    const children = subDepts.filter((d) => String(d.parent_dept_id) === String(p.id));
                    if (children.length === 0) {
                        return <option key={p.id} value={p.code}>{p.name}</option>;
                    }
                    return (
                        <optgroup key={p.id} label={p.name}>
                            <option value={p.code}>{p.name} (dept)</option>
                            {children.map((c) => (
                                <option key={c.id} value={c.code}>↳ {c.name}</option>
                            ))}
                        </optgroup>
                    );
                })
            ) : (
                departments.map((d) => (
                    <option key={d.id} value={d.code}>{d.name}</option>
                ))
            )}
        </select>
    );

    // Simple Mode + twoFields: disabled BU field (mirrors selected dept) + normal dept picker
    if (twoFields) {
        const selectedDept = departments.find((d) => d.code === value);
        return (
            <>
                <div className="form-group">
                    <label>Business Unit</label>
                    <div
                        className="form-control"
                        style={{
                            background: 'var(--color-bg)',
                            color: selectedDept ? 'inherit' : 'var(--color-text-muted)',
                            cursor: 'default',
                            userSelect: 'none',
                            height: 'auto',
                            minHeight: '38px',
                            lineHeight: '1.3',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.75,
                        }}
                    >
                        {selectedDept ? selectedDept.name : <span>Mirrors<br />department</span>}
                    </div>
                </div>
                <div className="form-group">
                    <label>{deptLabel}</label>
                    {inner}
                </div>
            </>
        );
    }

    if (label) {
        return (
            <div className="form-group">
                <label>{label}</label>
                {inner}
            </div>
        );
    }
    return inner;
}
