# SMS & USSD Guide for Fishers

This guide is for fishers who do not have a smartphone or reliable internet access.

---

## Reporting a Catch by SMS

Send an SMS to **+XXX-SILLAGE** (your regional number).

### Step-by-step

| Step | You send | System replies |
|------|----------|----------------|
| 1 | `START` | `SILLAGE BLEU — Enter your Vessel ID:` |
| 2 | `VESSEL-SN-001` | `Vessel found. Enter species caught:` |
| 3 | `Yellowfin Tuna` | `Enter catch weight in KG:` |
| 4 | `250` | `Confirm: Vessel VESSEL-SN-001, Yellowfin Tuna, 250kg — Reply YES or NO` |
| 5 | `YES` | `Catch submitted! You will receive confirmation shortly.` |

To cancel at any step, send `NO`.  
To start over, send `START`.

---

## Reporting via USSD

Dial `*384*SILLAGE#` (your regional USSD code).

Follow the same menu prompts as SMS above. USSD works without an internet connection and does not cost SMS credit on most networks.

---

## Receiving Confirmation

After your catch is verified by a regional officer, you will receive an SMS:

```
SILLAGE BLEU: Your catch [ID] has been APPROVED.
Blue credits earned: 2.50
Your total credits: 15.75
```

If rejected:
```
SILLAGE BLEU: Your catch [ID] was REJECTED.
Reason: Weight exceeds vessel capacity.
Contact your cooperative for assistance.
```

---

## Checking Your Balance

Send: `BALANCE`

Reply:
```
SILLAGE BLEU
Vessel: VESSEL-SN-001
Total catches: 12
Approved: 10
Blue credits: 15.75
```

---

## Tips for Accurate Reporting

- Report your catch **on the same day** it is landed
- Use your **exact Vessel ID** as registered
- Enter weight in **whole kilograms** (e.g. `250`, not `250.5`)
- If you make a mistake, send `NO` to cancel and `START` to begin again

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Vessel not found" | Check your Vessel ID with your cooperative |
| No reply received | Wait 5 minutes and try again; check SMS credit |
| "Session expired" | Send `START` to begin a new session |
| Catch rejected unexpectedly | Contact your regional verifier |
