export const arrearsFollowupPoolFixture = {
  existingArrearsRecords: [
    {
      id: "hist-001",
      task_id: "hist-001",
      source: "arrear_tasks",
      room: "501 / 1",
      tenant_card_id: "CUST-501",
      remain: 450,
      due_date: "2026-05-20",
      followup_status: "pending_followup"
    },
    {
      id: "hist-closed",
      task_id: "hist-closed",
      source: "arrear_tasks",
      room: "501 / 2",
      remain: 100,
      due_date: "2026-05-22",
      close_status: "closed"
    }
  ],
  currentDueUnpaid: [
    {
      room: "601 / 3",
      name: "Tenant 601",
      remaining: 700,
      dueDate: "2026-05-18",
      sourceRef: "601|2026-05-18"
    }
  ],
  ttlockExpiredCards: [
    {
      room: "701 / 4",
      cardName: "778899 D0 0520",
      dueDate: "2026-05-19",
      sourceRef: "701|778899|2026-05-19",
      bedRentAmount: 630
    },
    {
      room: "702 / 5",
      cardName: "889900 D0 0520",
      dueDate: "2026-05-19",
      sourceRef: "702|889900|2026-05-19"
    }
  ],
  unknownSourceRows: [
    {
      id: "unknown-001",
      source_type: "random_customer_record",
      room: "999 / 9",
      remain: 1,
      due_date: "2026-05-19"
    }
  ]
};
