import { prisma } from "../src/core/database.js";

const itemsUpdate = {
  "durabox panel": { qty: 4, price: 700000 },
  "relay 5 kaki 12v": { qty: 4, price: 5000 },
  "relay 5 kaki 12v  ": { qty: 4, price: 5000 },
  "spacer pcb 1cm": { qty: 32, price: 1500 },
  "kipas dc 40x40x10 5v": { qty: 4, price: 12000 },
  "fan dc 40x40x10 5v": { qty: 4, price: 12000 },
  "mikrotik": { qty: 4, price: 1535000 },
  "stepdown dc to dc 12v5a": { qty: 4, price: 21000 },
  "stepdown 12v 5a xl4015": { qty: 4, price: 21000 },
  "durabox junction box": { qty: 4, price: 130000 },
  "psu meanwell 12v 5a": { qty: 4, price: 175000 },
  "battery holder 3 slot": { qty: 4, price: 8000 },
  "battery holder": { qty: 4, price: 8000 },
  "flat cabel 10pin": { qty: 8, price: 15000 },
  "flat cable 10pin": { qty: 8, price: 15000 },
  "dioda 10a10": { qty: 12, price: 3000 },
  "dioda 10a 10": { qty: 12, price: 3000 },
  "terminal blok pcb 2pole": { qty: 4, price: 1500 },
  "terminal blok 2 pole": { qty: 4, price: 1500 },
  "battery 18650": { qty: 12, price: 45000 },
  "battery 18650 vtc": { qty: 12, price: 45000 },
  "spacer pcb 2cm": { qty: 8, price: 2000 },
  "raspberry": { qty: 4, price: 4225000 },
  "raspberry pi 4gb": { qty: 4, price: 4225000 },
  "bms charger 20a": { qty: 4, price: 18000 },
  "spacer pcb 3cm": { qty: 16, price: 2500 },
  "terminal blok pcb 3pole": { qty: 16, price: 2000 },
  "terminal blok 3 pole": { qty: 16, price: 2000 },
  "chip radar": { qty: 4, price: 85000 },
  "buck converter 5v": { qty: 4, price: 42000 },
  "stepdown 5v buck converter": { qty: 4, price: 42000 },
  "socket idc 10pin 2x5": { qty: 16, price: 2000 },
  "cable gland pg9": { qty: 8, price: 2500 },
  "modem": { qty: 4, price: 1600000 },
  "mcb 2pole 2a": { qty: 4, price: 146898 },
  "mcb 2 pole 2a": { qty: 4, price: 146898 },
  "pcb radar": { qty: 8, price: 35000 },
  "terminal blok 4 pole": { qty: 4, price: 4000 },
  "sdcard": { qty: 4, price: 350000 },
  "sd card 32gb": { qty: 4, price: 350000 },
  "skun male biru": { qty: 1, price: 25000 },
  "skun male female hitam": { qty: 1, price: 35000 },
  "skun male female merah": { qty: 1, price: 35000 },
  "skun male hitam": { qty: 1, price: 25000 },
  "skun male merah": { qty: 1, price: 25000 }
};

async function main() {
  const draft = await prisma.request.findFirst({
    where: { code: "REQ-2026-001" },
    include: { items: true }
  });

  if (!draft) {
    console.error("Draft request REQ-2026-001 not found!");
    return;
  }

  console.log("Found draft:", draft.title);
  let totalAmount = 0;

  for (const item of draft.items) {
    const update = itemsUpdate[item.name] || itemsUpdate[item.name.toLowerCase()];
    if (update) {
      console.log(`Updating ${item.name}: qty ${item.qty} -> ${update.qty}, price ${item.price} -> ${update.price}`);
      await prisma.requestItem.update({
        where: { id: item.id },
        data: {
          qty: update.qty,
          price: update.price
        }
      });
      totalAmount += update.qty * update.price;
    } else {
      console.log(`No update pattern for ${item.name}, keeping current.`);
      totalAmount += item.qty * Number(item.price);
    }
  }

  // Update total request amount
  await prisma.request.update({
    where: { id: draft.id },
    data: { amount: totalAmount }
  });

  console.log("Draft successfully updated! Total amount:", totalAmount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
