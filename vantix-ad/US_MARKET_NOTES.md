# Vantix: US market / Florida compliance notes (v7)

## Done in v7
- **Implied health claims removed.** "Allergens" and "even while you're sleeping" are gone. The EPA says duct cleaning "has never been shown to actually prevent health problems", and Meta bans exaggerated health-benefit claims.
- **"Limited-time" became "Miami Special".** No end date is known, and an open-ended "limited time" claim is deceptive.
- **End-card fine print, on screen for about 5 seconds (FTC "Free" Guide, 16 CFR 251):**
  *"$97 air duct cleaning. Free AC system inspection and basic dryer-vent cleaning included with paid duct cleaning. Serving Miami."*
  Repeat it in the ad's primary text.
- **"Dramatization." disclosure on every shot.** Every shot in the ad is AI-generated, including the technician in the Vantix shirt.

## Blockers before launch [CLIENT INPUT]
1. **Florida contractor license number.** Fla. Stat. 489.119(5)(b) requires it in every advertisement. Render it with: `VANTIX_LICENSE=CAC1234567 python3 build_v7.py ...`
   If Vantix holds no CAC/CMC license, it may not advertise AC inspection or duct-system work at all (489.127).
2. **Offer scope.** How many vents are included and what costs extra. Then add: "Includes up to [X] vents. Additional vents extra."
3. **Trust signals.** Add these only if true: "Licensed & Insured", Google rating and review count, and a phone number for "Call or text".
4. **Real crew footage.** Use it to replace the AI technician once it's available.

## Spanish version (recommended as a separate ad)
- **Why:** 75.3% of Miami-Dade residents aged 5+ speak a language other than English at home (Census QuickFacts).
- **Condition:** launch it only if booking and the phone line can handle Spanish.

**Script:**
> Oye, Miami… una pregunta rápida. El aire está prendido casi todo el año, ¿verdad? ¿Y cuándo fue la última vez que le echaste un ojo a los ductos? Porque todo ese polvo y esa suciedad se riegan por la casa cada vez que el aire arranca. Ahí entramos nosotros: Vantix Home Services. Somos de aquí, de Miami. Ahora mismo te limpiamos los ductos del aire por solo noventa y siete dólares. Y con eso, te revisamos el aire acondicionado gratis y te hacemos una limpieza básica del ducto de la secadora. Tres servicios por noventa y siete dólares. Dale, toca abajo y separa tu cita.

**On-screen text:**
- Hook: "MIAMI: ¿QUÉ HAY EN TUS DUCTOS?"
- Labels: "Dramatización." / "Antes." / "Después."

## Sources
- [Fla. Stat. 489.119](http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0400-0499/0489/Sections/0489.119.html)
- [Fla. Stat. 489.105](http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0400-0499/0489/Sections/0489.105.html)
- [EPA: Should you have your air ducts cleaned?](https://www.epa.gov/indoor-air-quality-iaq/should-you-have-air-ducts-your-home-cleaned)
- [FTC "Free" Guide](https://www.ftc.gov/legal-library/browse/rules/guide-concerning-use-word-free-similar-representations)
- [FTC .com Disclosures](https://www.ftc.gov/business-guidance/resources/com-disclosures-how-make-effective-disclosures-digital-advertising)
- [Meta: Unacceptable business practices](https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/)
- [Census QuickFacts: Miami-Dade](https://www.census.gov/quickfacts/miamidadecountyflorida)
