# Frontend SRD Validation Layer — Quick Reference

## TL;DR

Three files you need to know:

1. **`useCharacterValidation.ts`** — The hook that validates everything
2. **`ValidationDisplay.tsx`** — Shows errors to users  
3. **`VALIDATION_LAYER.md`** — The full documentation

## 30-Second Usage

```typescript
import { useCharacterValidation } from "@/hooks/useCharacterValidation";
import { CharacterValidationBanner } from "@/components/character/CharacterValidationBanner";

function CharacterSheet({ character, classData }) {
  const validation = useCharacterValidation(character, classData);

  return (
    <div>
      <CharacterValidationBanner
        violations={validation.violations}
        blockingSave={validation.blockingSave}
      />
      <button disabled={validation.blockingSave}>Save</button>
    </div>
  );
}
```

## What It Validates

| Rule | Error? | SRD Page |
|------|--------|----------|
| Traits sum to +2 | ✅ Yes | 3 |
| Domain loadout ≤ 5 | ✅ Yes | 22 |
| Armor score ≤ 12 | ✅ Yes | 20 |
| Level in [1,10] | ✅ Yes | — |
| Domains in class | ✅ Yes | 22 |
| Hope in range | ⚠️ Warning | 3 |
| Stats in range | ⚠️ Warning | 3 |
| Trackers OK | ⚠️ Warning | — |

## Key Components

### useCharacterValidation
```typescript
const validation = useCharacterValidation(character, classData);
// Returns: { isValid, violations, blockingSave }
```

### ValidationDisplay
```typescript
<ValidationDisplay violations={violations} blockingSave={blockingSave} />
```

### CharacterValidationBanner
```typescript
<CharacterValidationBanner violations={violations} blockingSave={blockingSave} />
```

### LoadoutValidationIndicator
```typescript
<LoadoutValidationIndicator loadout={loadout} vault={vault} isFull={isFull} />
```

### ArmorValidationDisplay
```typescript
<ArmorValidationDisplay baseArmor={10} level={3} selectedArmorName="Leather" />
```

## Form Validators

For quick inline validation without the full hook:

```typescript
// Trait assignment
const { isValid, message, sum } = validateTraitsForAssignment(traits);

// Domain loadout
const { canAdd, current, max } = validateLoadoutCapacity(loadout);

// Armor selection
const { isValid, score, max, warning } = validateArmorForEquip(10, 3);
```

## Violation Object

```typescript
{
  id: "trait-sum-invalid",
  field: "traitBonuses",
  severity: "error",           // or "warning"
  message: "Trait modifiers sum to 3; must equal +2",
  suggestion: "Adjust traits so bonuses sum to exactly +2",
  srdPage: 3
}
```

## Color Scheme

```
Error (Blocking):    #fe5f55 (ember red)
Warning (Non-blocking): #f7b500 (gold)
Valid:              #577399 (steel blue)
```

## Common Patterns

### Pattern 1: Show errors in form
```typescript
const validation = useCharacterValidation(character, classData);
return (
  <form>
    {validation.violations.length > 0 && (
      <ValidationDisplay violations={validation.violations} />
    )}
  </form>
);
```

### Pattern 2: Disable button on errors
```typescript
<button disabled={validation.blockingSave}>Save</button>
```

### Pattern 3: Show inline feedback
```typescript
{validation.isValid ? (
  <span className="text-blue-600">✓ Valid</span>
) : (
  <span className="text-red-600">⚠ Fix errors</span>
)}
```

### Pattern 4: Real-time form validation
```typescript
const traits = useFormValue("traits");
const traitValidation = useMemo(
  () => validateTraitsForAssignment(traits),
  [traits]
);
return traitValidation.isValid ? "✓" : `⚠ ${traitValidation.message}`;
```

## Integration Checklist

- [ ] Import `useCharacterValidation`
- [ ] Call hook with character + classData
- [ ] Show violations with `ValidationDisplay`
- [ ] Disable save if `validation.blockingSave`
- [ ] Test with invalid character
- [ ] Test with valid character
- [ ] Verify SRD citations shown
- [ ] Check mobile layout

## Error Messages Are Helpful

Users see:
```
⚠ Armor Score exceeds cap

Armor Score 15 exceeds maximum of 12. 
💡 Select lower-tier armor or consult the SRD for armor selection rules.

SRD page 20: Armor Score maximum is 12
```

Not generic errors like "VALIDATION_ERROR".

## Violations Are Typed

```typescript
interface ValidationViolation {
  id: string;
  field: string;
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
  srdPage?: number;
}
```

## Performance

- ✅ Validation is < 50ms
- ✅ Memoized to avoid unnecessary reruns
- ✅ No async/network calls
- ✅ Safe to call on every keystroke

## Testing

```typescript
// Test a violation
const character = { stats: { strength: 9 }, ... };
const validation = useCharacterValidation(character, classData);
expect(validation.isValid).toBe(false);

// Test a fix
const fixed = { ...character, stats: { ...character.stats, strength: 2 } };
const validation2 = useCharacterValidation(fixed, classData);
expect(validation2.isValid).toBe(true);
```

## Troubleshooting

**Q: Validation not updating?**
A: Make sure you're passing updated character/classData objects. Validation is memoized.

**Q: Can't disable button?**
A: Check `validation.blockingSave`, not `validation.isValid`. Warnings don't block.

**Q: SRD page missing?**
A: Each validator should include `srdPage`. Check the violation object.

**Q: Performance slow?**
A: Validation should be < 50ms. Check for expensive operations elsewhere.

## Documentation Locations

- **Full guide:** `frontend/src/VALIDATION_LAYER.md`
- **Integration:** `frontend/src/components/character/INTEGRATION_GUIDE.md`
- **API contract:** `frontend/src/API_VALIDATION_CONTRACT.md`
- **Tests:** `frontend/src/TESTING_GUIDE.md`
- **Components:** Each .tsx file has JSDoc comments

## Related Files

```
useCharacterValidation()           → frontend/src/hooks/useCharacterValidation.ts
ValidationDisplay                  → frontend/src/components/character/ValidationDisplay.tsx
CharacterValidationBanner          → frontend/src/components/character/CharacterValidationBanner.tsx
LoadoutValidationIndicator         → frontend/src/components/character/LoadoutValidationIndicator.tsx
ArmorValidationDisplay             → frontend/src/components/character/ArmorValidationDisplay.tsx
TraitAssignmentPanel (enhanced)    → frontend/src/components/character/TraitAssignmentPanel.tsx
Backend validators                 → compliance/src/validators/
Backend integration                → backend/src/compliance/
```

## Next: Backend Integration

When you're ready to add backend validation:

1. Read `API_VALIDATION_CONTRACT.md`
2. Implement backend validators in `backend/src/compliance/`
3. Return 400/409/422 status with violation details
4. Frontend will show the violations to user

## Support

- Check VALIDATION_LAYER.md for detailed docs
- Review test examples in TESTING_GUIDE.md
- Look at component JSDoc comments
- File an issue with your specific use case
