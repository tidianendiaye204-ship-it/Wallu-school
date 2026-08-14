import { allocatePayment, money, currentPeriod, nextPeriod } from "../../../components/utils/helpers";

describe("Helpers - allocatePayment", () => {
  it("Mensualité 25000, paiement 25000 → aucun report, aucun manque", () => {
    const period = currentPeriod();
    const dues = [{ period, amountDue: 25000, amountAllocated: 0 }];
    const { newDues, allocations, remaining } = allocatePayment(dues, 25000, 25000);

    expect(remaining).toBe(0);
    expect(allocations).toEqual([{ period, amount: 25000 }]);
    expect(newDues[0].amountAllocated).toBe(25000);
    expect(newDues.length).toBe(1);
  });

  it("Mensualité 25000, paiement 35000 → 10000 reportés au mois suivant", () => {
    const period = currentPeriod();
    const dues = [{ period, amountDue: 25000, amountAllocated: 0 }];
    const { newDues, allocations, remaining } = allocatePayment(dues, 25000, 35000);

    expect(remaining).toBe(0);
    expect(allocations.length).toBe(2);
    expect(allocations[0]).toEqual({ period, amount: 25000 });
    
    const nextPer = nextPeriod(period);
    expect(allocations[1]).toEqual({ period: nextPer, amount: 10000 });

    expect(newDues.length).toBe(2);
    expect(newDues[0].amountAllocated).toBe(25000);
    expect(newDues[1].period).toBe(nextPer);
    expect(newDues[1].amountDue).toBe(25000);
    expect(newDues[1].amountAllocated).toBe(10000);
  });

  it("Mensualité 25000, paiement 22000 → 3000 de manque, pas de report", () => {
    const period = currentPeriod();
    const dues = [{ period, amountDue: 25000, amountAllocated: 0 }];
    const { newDues, allocations, remaining } = allocatePayment(dues, 25000, 22000);

    expect(remaining).toBe(0);
    expect(allocations).toEqual([{ period, amount: 22000 }]);
    expect(newDues[0].amountAllocated).toBe(22000);
    expect(newDues.length).toBe(1);
  });

  it("Deux paiements successifs sur le même élève dans le même mois (chaînés)", () => {
    const period = currentPeriod();
    const initialDues = [{ period, amountDue: 25000, amountAllocated: 0 }];
    
    // Premier appel (15000)
    const { newDues: duesAfterFirst, remaining: rem1 } = allocatePayment(initialDues, 25000, 15000);
    
    expect(rem1).toBe(0);
    expect(duesAfterFirst[0].amountAllocated).toBe(15000);
    expect(duesAfterFirst.length).toBe(1);

    // Deuxième appel (15000), en réutilisant le tableau `duesAfterFirst`
    const { newDues: duesAfterSecond, allocations: alloc2, remaining: rem2 } = allocatePayment(duesAfterFirst, 25000, 15000);
    
    expect(rem2).toBe(0);
    expect(duesAfterSecond[0].amountAllocated).toBe(25000); // 15000 + 10000 restants
    
    // Vérifier la création du report
    expect(duesAfterSecond.length).toBe(2);
    const nextPer = nextPeriod(period);
    expect(duesAfterSecond[1].period).toBe(nextPer);
    expect(duesAfterSecond[1].amountAllocated).toBe(5000); // Le reste (15000 - 10000 alloués)
    
    // Vérifier les allocations de la deuxième transaction
    expect(alloc2).toEqual([
      { period, amount: 10000 },
      { period: nextPer, amount: 5000 }
    ]);
  });
});

describe("Helpers - money", () => {
  it("formate correctement les montants avec espaces insécables normaux et le symbole F", () => {
    const formatted = money(25000);
    // money() replace \u202f par un espace normal, donc:
    expect(formatted).toBe("25 000 F");
  });
});

describe("Helpers - dates (currentPeriod, nextPeriod)", () => {
  it("nextPeriod calcule correctement le mois suivant (changement d'année compris)", () => {
    expect(nextPeriod("2024-05")).toBe("2024-06");
    expect(nextPeriod("2024-12")).toBe("2025-01");
  });
});
