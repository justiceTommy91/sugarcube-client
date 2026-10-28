# Shopping Bag Feature

This feature handles adding products to the shopping bag and displaying toast notifications.

## Testing Toast Notifications in Development

By default, in development environments (localhost), clicking "Add to shopping bag" will open a new browser tab with the IKEA shopping cart. This can interfere with seeing the toast notification.

To test the toast notification in development:

1. Add the URL parameter `?disableCartRedirect=true` to your development URL
   - Example: `http://localhost:8000/design?disableCartRedirect=true`

2. Click the "Add to shopping bag" button on any product

3. The toast notification should appear without opening a new tab

## How it Works

The shopping bag functionality uses Redux Saga to handle the add-to-bag flow:

1. **Button Click**: User clicks "Add to shopping bag" button
2. **Action Dispatch**: `addToBag` action is dispatched with product ID
3. **Saga Processing**: 
   - In production/CTE with authentication: Makes API call to add item
   - In development/without auth: Opens cart URL in new tab (unless disabled)
4. **Toast Display**: Shows success/failure toast notification

## Key Files

- `redux/actions.ts` - Redux actions for shopping bag
- `redux/sagas.js` - Saga logic for handling add to bag
- `index.ts` - `useShoppingBag` hook for components
- `/src/toasts/AddedToBagToast.tsx` - Toast component