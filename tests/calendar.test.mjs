import test from 'node:test';
import assert from 'node:assert/strict';
import {validDateKey,todayKey,weekStart,weekNumber,formatWeek,monthCells,addDays} from '../public/calendar.js';

test('calendar accepts real leap dates and rejects invalid dates',()=>{
 assert.equal(validDateKey('2024-02-29'),true);assert.equal(validDateKey('2026-02-29'),false);assert.equal(validDateKey('2026-13-01'),false);assert.equal(validDateKey('2026-2-01'),false);assert.equal(validDateKey('no-date'),false);assert.throws(()=>weekStart('2026-02-30'));
});
test('date selections map to Monday archives across month and year boundaries',()=>{
 assert.equal(weekStart('2026-10-29'),'2026-10-26');assert.equal(weekStart('2026-11-01'),'2026-10-26');assert.equal(weekStart('2027-01-01'),'2026-12-28');assert.equal(weekStart('2026-11-02'),'2026-11-02');assert.equal(weekNumber('2026-10-29'),44);assert.equal(weekNumber('2027-01-01'),53);assert.equal(formatWeek('2027-01-01'),'2026.12.28 — 2027.01.03');
});
test('calendar uses Shanghai today rather than host time',()=>{
 assert.equal(todayKey(new Date('2026-10-28T16:30:00Z')),'2026-10-29');assert.equal(todayKey(new Date('2026-10-28T15:30:00Z')),'2026-10-28');
});
test('month grid is continuous with leap day, weekdays and adjacent-month dates',()=>{
 const cells=monthCells(2024,2);assert.equal(cells.length,42);assert.equal(cells[0].key,'2024-01-29');assert.equal(cells.filter(x=>x.inMonth).length,29);assert(cells.some(x=>x.key==='2024-02-29'&&x.inMonth));assert.equal(new Date(cells[0].key+'T00:00:00Z').getUTCDay(),1);for(let i=1;i<cells.length;i++)assert.equal(cells[i].key,addDays(cells[i-1].key,1));
});
