# sparse-set
An implementation of Briggs and Torczon's [Efficient Representation for Sparse Sets](https://dl.acm.org/doi/pdf/10.1145/176454.176484).

This package exports a single class, `SparseSet`, with the following interface:

```ts
class SparseSet {
    readonly bound: number;
    readonly preserve_order: boolean;
    length: number;
    size: number;

    constructor(bound: number, options?: SparseSetOpts);
    
    has(k: number): boolean;
    add(k: number): SparseSet;
    clear(): SparseSet;
    delete(k: number, preserve_order?: boolean): boolean;
    forEach(cb: (k: number) => void): void;
    copy(options?: SparseSetOpts & { bound?: number; }): SparseSet;
    complement(options?: SparseSetOpts & { bound?: number; }): SparseSet;
    union(s: SparseSet): SparseSet;
    intersect(s: SparseSet, preserve_order?: boolean): SparseSet;
    difference(s: SparseSet, preserve_order?: boolean): SparseSet;
    xor(s: SparseSet, preserve_order?: boolean): SparseSet;
    entries(): Generator<[number, number]>;
    keys(): Generator<number>;
    values(): Generator<number>;
    [Symbol.iterator](): Generator<number>;
}
```

`SparseSetOpts` looks like this:

```ts
export interface SparseSetOpts {
    values?: Iterable<number>;
    preserve_order?: boolean;
    memory?: {
        buffer: ArrayBuffer;
        byteOffset?: number;
    };
}
```

The `SparseSet` constructor requires a `bound` argument which specifies the maximum size of the set (and is one more than the largest value that can be stored in the set). This is used to pre-allocate memory for the entire set, and, by defining a finite universe of set elements, allows performing set complement operations. If `memory` is not provided, a new `ArrayBuffer` is automatically allocated. Note that one of the advantages of this sparse set data structure is that memory can be allocated quickly, because it does not need to be initialized--however, JavaScript does not allow allocating uninitialized memory (`ArrayBuffer`s are always initialized to zero), which eliminates that advantage. However, should you already have a sufficiently large `ArrayBuffer` on hand to re-use, you can pass it through the `memory` object to avoid re-allocation and re-initialization costs. Also note that `TypedArray` and `DataView` objects conform to the necessary interface to be directly passed as `memory` objects. Like the built-in `Set` object, the `SparseSet` constructor can take in an optional iterable of initial elements via the `values` field of `SparseSetOpts`. There is also an optional `preserve_order` argument; by default, `SparseSet` preserves insertion order of elements for iteration; however, `delete`s, `intersection`s, `difference`s, and `xor`s can scramble the insertion order. Setting `preserve_order` to `true` ensures that insertion order is preserved under all operations, at a slight performance penalty. Each of those four methods also takes an optional `preserve_order` argument, which can be used to override the default set by the constructor.

Note that `SparseSet` duplicates the interface of the built-in JavaScript `Set` type, with following additional properties and methods and properties:

* `bound: number`: the maximum size of the set; 1 more than the maximum value that can be stored in the set.
* `length: number`: an alias for `size`. In contrast to a built-in `Set`, the `length` and `size` properties can be set to truncate the latest values added to a `SparseSet`. Attempting to set `length` or `size` to something larger than their current values will throw an exception.
* `copy(options?: SparseSetOpts & { bound?: number; }): SparseSet`: efficiently produces a new `SparseSet` containing a copy of the data in the original `SparseSet`. If `bound` or `preserve_order` options are omitted, they will be copied from the original `SparseSet`. Setting `bound` to a smaller value than that of the original will truncate elements that exceed the new bound. Backing memory is not re-used; pre-allocated memory for the new set can be passed in through the options object, but otherwise new memory will be automatically allocated. 
* `complement(options?: SparseSetOpts & { bound?: number; })`: efficiently produces a new `SparseSet` containing all elements below `bound` which are not in the original `SparseSet`. If `bound` or `preserve_order` options are omitted, they will be copied from the original `SparseSet`. Setting `bound` to a smaller value than that of the original will truncate elements that exceed the new bound. Backing memory is not re-used; pre-allocated memory for the new set can be passed in through the options object, but otherwise new memory will be automatically allocated.
* `union(s: SparseSet): SparseSet`: updates the current `SparseSet` with the elements from the given `SparseSet`, dropping any elements which are outside the current bound.
* `intersection(s: SparseSet, preserve_order?: boolean): SparseSet`: removes elements from the current `SparseSet` that do not occur in the given `SparseSet`.
* `difference(s: SparseSet, preserve_order?: boolean): SparseSet`: removes elements from the current `SparseSet` which *do* occur in the given `SparseSet`.
* `xor(s: SparseSet, preserve_order?: boolean): SparseSet`: removes elements from the current `SparseSet` which occur in the given `SparseSet`, and adds elements from the given `SparseSet` which were not previously in the current `SparseSet`, dropping any elements which are outside the current bound.