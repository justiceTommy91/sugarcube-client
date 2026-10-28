export const convertProductId = (productId: string) => productId.replace(/(\d{3})(?=\d)/g, '$1.')
