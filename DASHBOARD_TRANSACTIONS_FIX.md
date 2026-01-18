# Fix Dashboard Transactions Display

## Changes needed:

1. Remove `groupedTransactions` useMemo (lines ~153-235)
2. Remove `toggleMonth` function (line ~242)
3. Remove `expandedMonths` state (line ~29)
4. Add `filteredAndPaginatedTransactions` useMemo
5. Replace accordion JSX (lines ~570-690) with simple paginated list

## New implementation:

### State (already added):
- `currentPage` - pagination page
- `transactionsFilter` - filter by period ('all', 'day', 'week', 'month')
- `transactionsPerPage = 10` - items per page

### Replace groupedTransactions with:
```javascript
const filteredAndPaginatedTransactions = useMemo(() => {
  // Filter by period
  // Sort by date
  // Paginate (10 per page)
  // Return { transactions, total, totalPages, currentPage }
}, [transactions, transactionsFilter, currentPage, transactionsPerPage]);
```

### Replace JSX:
- Remove accordion structure
- Show simple list of transactions
- Add pagination controls (Назад / Вперед)
- Add period filter dropdown
