const CART_STORAGE_KEY = "guest_cart";

export const cartStorage = {
    getCart: () => {
        try {
            const cartJson = localStorage.getItem(CART_STORAGE_KEY);
            if (!cartJson) {
                return { items: [], totalPrice: 0 };
            }
            return JSON.parse(cartJson);
        } catch (error) {
            console.error("Error reading cart from localStorage:", error);
            return { items: [], totalPrice: 0 };
        }
    },

    addItem: (productId, productName, price, quantity = 1) => {
        const cart = cartStorage.getCart();
        const existingItemIndex = cart.items.findIndex(
            (item) => item.productId === productId
        );

        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].subtotal =
                cart.items[existingItemIndex].price * cart.items[existingItemIndex].quantity;
        } else {
            cart.items.push({
                productId,
                productName,
                price: parseFloat(price),
                quantity,
                subtotal: parseFloat(price) * quantity,
            });
        }

        cart.totalPrice = cart.items.reduce(
            (sum, item) => sum + item.subtotal,
            0
        );

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        return cart;
    },

    updateItemQuantity: (productId, quantity) => {
        if (quantity < 1) {
            return cartStorage.removeItem(productId);
        }

        const cart = cartStorage.getCart();
        const itemIndex = cart.items.findIndex(
            (item) => item.productId === productId
        );

        if (itemIndex >= 0) {
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].subtotal =
                cart.items[itemIndex].price * quantity;
        }

        cart.totalPrice = cart.items.reduce(
            (sum, item) => sum + item.subtotal,
            0
        );

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        return cart;
    },

    removeItem: (productId) => {
        const cart = cartStorage.getCart();
        cart.items = cart.items.filter(
            (item) => item.productId !== productId
        );

        cart.totalPrice = cart.items.reduce(
            (sum, item) => sum + item.subtotal,
            0
        );

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        return cart;
    },

    clearCart: () => {
        localStorage.removeItem(CART_STORAGE_KEY);
        return { items: [], totalPrice: 0 };
    },

    getCartItems: () => {
        return cartStorage.getCart().items;
    },
};

