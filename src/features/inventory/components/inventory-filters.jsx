"use client";
export function InventoryFilters({ search, onSearchChange, categoryId, onCategoryChange, status, onStatusChange, categories, }) {
    return (<div className="flex flex-wrap gap-3">
      <div className="relative flex-1">
        <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search by name..." className="w-full rounded-lg border bg-background px-3 py-2 pl-10 text-sm"/>
        <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
        </svg>
      </div>
      <select value={categoryId} onChange={(e) => onCategoryChange(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">All Categories</option>
        {categories.map((cat) => (<option key={cat.id} value={cat.id}>
            {cat.name}
          </option>))}
      </select>
      <select value={status} onChange={(e) => onStatusChange(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="all">All Status</option>
        <option value="in_stock">In Stock</option>
        <option value="low_stock">Low Stock</option>
        <option value="out_of_stock">Out of Stock</option>
      </select>
    </div>);
}
