import 'mocha';
import {expect} from 'chai';
import { SparseSet } from '../src';

describe("Constructive Tests", () => {
  it("should contain initial values", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5] });
    expect([...s]).to.eql([1,2,3,4,5]);
  });

  it("should contain added values", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5] });
    s.add(10);
    s.add(9);
    s.add(8);
    s.add(7);
    s.add(6);
    expect([...s]).to.eql([1,2,3,4,5,10,9,8,7,6]);
  });

  it("should report contained values", () => {
    const s = new SparseSet(256, { values: [1,3,5,7,9] });
    for (const i of [1,3,5,7,9]) {
      expect(s.has(i)).to.eql(true);
    }
    for (const i of [0,2,4,6,8]) {
      expect(s.has(i)).to.eql(false);
    }
  });

  it("should contain unioned values", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5] });
    s.union(new SparseSet(256, { values: [10,9,8,7,6] }));
    expect([...s]).to.eql([1,2,3,4,5,10,9,8,7,6]);
  });

  it("should contain copied values", () => {
    const s = new SparseSet(256, { values: [10,20,30,40,50] });
    expect([...s.copy()]).to.eql([10,20,30,40,50]);
  });

  it("should contain copied values below new bound", () => {
    const s = new SparseSet(256, { values: [10,20,30,40,50] });
    const t = s.copy({ bound: 40 });
    expect([...t]).to.eql([10,20,30]);
  });

  it("should contain complement values", () => {
    const s = new SparseSet(20, { values: [0,2,4,6,8,10,12,14,16,18] });
    expect([...s.complement()]).to.eql([1,3,5,7,9,11,13,15,17,19]);
  });
});

describe("Destructive Tests", () => {
  it("should delete elements", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5] });
    s.delete(3);
    expect([...s]).to.eql([1,2,5,4]);
    s.delete(2);
    expect([...s]).to.eql([1,4,5]);
  });

  it("should contain the set difference", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5,6,7,8,9] });
    s.difference(new SparseSet(256, { values: [2,4,6,8,10,12] }));
    expect([...s]).to.eql([1,9,3,7,5]);
  });

  it("should contain the set intersection", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5] });
    s.intersection(new SparseSet(256, { values: [4,5,6,7,8] }));
    expect([...s]).to.eql([5,4]);
  });

  it("should contain the symmetric difference", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5] });
    s.xor(new SparseSet(256, { values: [1,2,6,7,8] }));
    expect([...s]).to.eql([5,4,3,6,7,8]);
  });
});

describe("Order-preserving Tests", () => {
  it("should delete elements preserving order", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5], preserve_order: true });
    s.delete(3);
    expect([...s]).to.eql([1,2,4,5]);
    s.delete(2);
    expect([...s]).to.eql([1,4,5]);
  });

  it("should contain the set difference preserving order", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5,6,7,8,9], preserve_order: true });
    s.difference(new SparseSet(256, { values: [2,4,6,8,10,12] }));
    expect([...s]).to.eql([1,3,5,7,9]);
  });

  it("should contain the set intersection preserving order", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5], preserve_order: true });
    s.intersection(new SparseSet(256, { values: [4,5,6,7,8] }));
    expect([...s]).to.eql([4,5]);
  });

  it("should contain the symmetric difference preserving order", () => {
    const s = new SparseSet(256, { values: [1,2,3,4,5], preserve_order: true });
    s.xor(new SparseSet(256, { values: [1,2,6,7,8] }));
    expect([...s]).to.eql([3,4,5,6,7,8]);
  });
});