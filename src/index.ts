type TypedArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array;

export interface SparseSetOpts {
  values?: Iterable<number>;
  preserve_order?: boolean;
  memory?: {
    buffer: ArrayBuffer;
    byteOffset?: number;
  };
}

export class SparseSet {
  public readonly preserve_order: boolean;
  private dense: TypedArray;
  private sparse: TypedArray;
  private _len = 0;

  constructor(public readonly bound: number, options: SparseSetOpts = { }) {
    const { values, preserve_order, memory } = options;
    this.preserve_order = !!preserve_order;

    let alloc: number;
    let cons: new (b: ArrayBuffer, o: number, l: number) => TypedArray;
    if (bound < 257) {
      cons = Uint8Array;
      alloc = 2 * bound;
    } else if (bound < 65537) {
      cons = Uint16Array;
      alloc = 4 * bound;
    } else if (bound < 4294967297) {
      cons = Uint32Array;
      alloc = 8 * bound;
    } else {
      throw new Error("Unsupported Sparse Set Size");
    }
    
    const { buffer, byteOffset = 0 } = memory || { buffer: new ArrayBuffer(alloc) };
    const dense = new cons(buffer, byteOffset, bound);
    const sparse = new cons(buffer, byteOffset + alloc / 2, bound);
    
    let n = 0;
    if (values) for (const k of values) {
      if (k >= bound) { throw new Error("Set element out of bounds."); }
      const a = sparse[k];
      if (a >= n || dense[a] != k) {
        sparse[k] = n;
        dense[n] = k;
        n++;
      }
    }

    this._len = n;
    this.dense = dense;
    this.sparse = sparse;
  }

  get length() { return this._len; }
  set length(n: number) {
    n = n||0;
    if (n > this._len) {
      throw new Error("Cannot grow sparse set.")
    }
    if (n < 0) {
      throw new Error("Sparse set cannot have negative cardinality.")
    }
    this._len = n;
  }

  get size() { return this._len; }
  set size(n: number) { this.length = n; }

  public has(k: number) {
    const a = this.sparse[k];
    return a < this.length && this.dense[a] === k;
  } 

  public add(k: number) {
    if (k >= this.bound) { throw new Error("Set element out of bounds."); }
    const { sparse, dense, length: n } = this;
    const a = sparse[k];
    if (a >= n || dense[a] != k) {
      sparse[k] = n;
      dense[n] = k;
      this._len = n + 1; 
    }
  }

  public clear() {
    this._len = 0;
  }

  public delete(k: number, preserve_order = this.preserve_order) {
    let { sparse, dense, _len: n } = this;
    n--;
    const a = sparse[k];
    if (a <= n && dense[a] == k) {
      if (preserve_order) {
        for (let i = a; i < n; i++) {
          const e = dense[i+1];
          dense[i] = e
          sparse[e] = i;
        }
      } else {
        const e = dense[n];
        dense[a] = e;
        sparse[e] = a;
      }
      this._len = n;
      return true; 
    }
    return false;
  }

  public forEach(cb: (k: number) => void) {
    const { _len, dense } = this;
    for (let i = 0; i < _len; i++) {
      cb(dense[i]);
    }
  }

  public copy(options: SparseSetOpts & { bound?: number } = { }): SparseSet {
    if (typeof options.preserve_order === 'undefined') {
      options.preserve_order = this.preserve_order;
    }
    const bound = options.bound || this.bound;
    const s = new SparseSet(bound, options);
    const { _len, dense: td } = this;
    const { sparse: ss, dense: sd } = s;
    let write = 0;
    for (let read = 0; read < _len; read++) {
      const k = td[read];
      if (k < bound) { 
        sd[write] = k;
        ss[k] = write;
        write++;
      }
    }
    s._len = write;
    return s;
  }

  public complement(options: SparseSetOpts & { bound?: number } = { }): SparseSet {
    if (typeof options.preserve_order === 'undefined') {
      options.preserve_order = this.preserve_order;
    }
    const bound = options.bound || this.bound;
    const s = new SparseSet(bound, options);
    const { sparse: ss, dense: sd } = s;
    let j = 0;
    for (let i = 0; i < bound; i++) {
      if (!this.has(i)) {
        sd[j] = i;
        ss[i] = j;
        j++;
      }
    }
    s._len = j;
    return s;
  }

  public union(s: SparseSet) {
    const { _len, dense: sd } = s;
    let { sparse: ts, dense: td, _len: n, bound } = this;
    for (let i = 0; i < _len; i++) {
      const k = sd[i];
      if (k < bound) {
        const a = ts[k];
        if (a >= n || td[a] != k) {
          ts[k] = n;
          td[n] = k;
          n++; 
        }
      }
    }
    this._len = n;
  }

  private remove(s: SparseSet, diff: boolean, preserve_order: boolean) {
    let { _len, dense, sparse } = this;
    // TODO: when preserve_order is false, we might gain
    // some efficiency by guessing when s.has(k) is more
    // or less likely to be true, and selecting the
    // order-preserving loop anyway if it would be faster. 
    if (preserve_order) {
      let write = 0;
      for (let read = 0; read < _len; read++) {
        const k = dense[read];
        if (s.has(k) !== diff) {
          dense[write] = k;
          sparse[k] = write;
          write++;
        }
      }
      this._len = write;
    } else {
      let i = 0;
      while (i < _len) {
        const k = dense[i];
        if (s.has(k) === diff) {
          _len--;
          const e = dense[_len];
          dense[i] = e;
          sparse[e] = i;  
        } else {
          i++;
        }
      }
      this._len = _len;
    }
  }

  public intersection(s: SparseSet, preserve_order = this.preserve_order) {
    this.remove(s, false, preserve_order);
  }

  public difference(s: SparseSet, preserve_order = this.preserve_order) {
    this.remove(s, true, preserve_order);
  }

  public xor(s: SparseSet, preserve_order = this.preserve_order) {
    if (preserve_order) {
      const int: number[] = [];
      let { _len: n, dense, sparse } = this;
      // calculate the indices of intersection elements
      for (let i = 0; i < n; i++) {
        if (s.has(dense[i])) { int.push(i); }
      }
      this.union(s);
      if (int.length > 0) {
        // Remove the intersection
        let read = 0;
        let write = 0;
        let offset = 0;
        n = this._len;
        for(;;) {
          while (read === int[offset]) {
            read++;
            offset++;
          }
          if (read === n) { break; }
          const k = dense[read];
          dense[write] = k;
          sparse[k] = write;
          write++;
          read++;
        }
        this._len = write;
      }
    } else {
      const { _len, dense: sd } = s;
      let { _len: n, dense: td, sparse: ts, bound } = this;
      for (let i = 0; i < _len; i++) {
        const k = sd[i];
        if (k < bound) {
          const a = ts[k];
          if (a < n && td[a] === k) {
            n--;
            const e = td[n];
            td[a] = e;
            ts[e] = a;
          } else {
            td[n] = k;
            ts[k] = n;
            n++;
          }
        }
      }
      this._len = n;
    }
  }

  public *entries(): Generator<[number, number]> {
    const { _len, dense } = this;
    for (let i = 0; i < _len; i++) {
      yield [dense[i], dense[i]];
    }
  }

  public *keys() {
    const { _len, dense } = this;
    for (let i = 0; i < _len; i++) {
      yield dense[i];
    }
  }

  public values() {
    return this.keys();
  }

  public [Symbol.iterator]() {
    return this.keys();
  }
}