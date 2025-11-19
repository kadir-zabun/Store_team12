
export const adaptFakeStoreToBackend = (fakeStoreProduct, categoryMap = {}) => {
    const categoryMapping = {
        "men's clothing": { id: "cat1", name: "Men's Clothing" },
        "women's clothing": { id: "cat2", name: "Women's Clothing" },
        "electronics": { id: "cat3", name: "Electronics" },
        "jewelery": { id: "cat4", name: "Jewelery" },
    };

    const category = categoryMapping[fakeStoreProduct.category] || 
                     { id: "cat0", name: fakeStoreProduct.category || "Uncategorized" };

    return {
        productId: fakeStoreProduct.id.toString(),
        productName: fakeStoreProduct.title,
        quantity: Math.floor(Math.random() * 100) + 10,
        price: fakeStoreProduct.price,
        discount: Math.random() > 0.7 ? parseFloat((fakeStoreProduct.price * 0.1).toFixed(2)) : 0,
        description: fakeStoreProduct.description,
        images: [fakeStoreProduct.image],
        inStock: true,
        categoryId: category.id,
        categoryName: category.name,
    };
};


export const adaptFakeStoreProducts = (fakeStoreProducts) => {
    return fakeStoreProducts.map((product) => adaptFakeStoreToBackend(product));
};

export const adaptDummyJsonToBackend = (dummyJsonProduct) => {
    const categoryMapping = {
        "smartphones": { id: "cat3", name: "Electronics" },
        "laptops": { id: "cat3", name: "Electronics" },
        "fragrances": { id: "cat0", name: "Fragrances" },
        "skincare": { id: "cat0", name: "Skincare" },
        "groceries": { id: "cat0", name: "Groceries" },
        "home-decoration": { id: "cat0", name: "Home Decoration" },
        "furniture": { id: "cat0", name: "Furniture" },
        "tops": { id: "cat2", name: "Women's Clothing" },
        "womens-dresses": { id: "cat2", name: "Women's Clothing" },
        "womens-shoes": { id: "cat2", name: "Women's Clothing" },
        "mens-shirts": { id: "cat1", name: "Men's Clothing" },
        "mens-shoes": { id: "cat1", name: "Men's Clothing" },
        "mens-watches": { id: "cat1", name: "Men's Clothing" },
        "womens-watches": { id: "cat4", name: "Jewelery" },
        "womens-bags": { id: "cat4", name: "Jewelery" },
        "womens-jewellery": { id: "cat4", name: "Jewelery" },
        "sunglasses": { id: "cat0", name: "Accessories" },
        "automotive": { id: "cat0", name: "Automotive" },
        "motorcycle": { id: "cat0", name: "Motorcycle" },
        "lighting": { id: "cat0", name: "Lighting" },
    };

    const category = categoryMapping[dummyJsonProduct.category] || 
                     { id: "cat0", name: dummyJsonProduct.category || "Uncategorized" };

    const discountAmount = dummyJsonProduct.discountPercentage 
        ? parseFloat((dummyJsonProduct.price * (dummyJsonProduct.discountPercentage / 100)).toFixed(2))
        : 0;

    let images = [];
    if (dummyJsonProduct.images && Array.isArray(dummyJsonProduct.images) && dummyJsonProduct.images.length > 0) {
        images = [...dummyJsonProduct.images];
    } else if (dummyJsonProduct.thumbnail) {
        images = [dummyJsonProduct.thumbnail];
    } else {
        images = ["https://via.placeholder.com/300x250?text=No+Image"];
    }

    images = images.filter(img => img && typeof img === 'string' && img.trim() !== '');
    if (images.length === 0) {
        images = ["https://via.placeholder.com/300x250?text=No+Image"];
    }

    return {
        productId: dummyJsonProduct.id.toString(),
        productName: dummyJsonProduct.title,
        quantity: dummyJsonProduct.stock || Math.floor(Math.random() * 100) + 10,
        price: parseFloat(dummyJsonProduct.price),
        discount: discountAmount,
        description: dummyJsonProduct.description || "",
        images: images,
        inStock: (dummyJsonProduct.stock || 0) > 0,
        categoryId: category.id,
        categoryName: category.name,
    };
};

/**
 * DummyJSON ürünlerini backend formatına adapt et
 */
export const adaptDummyJsonProducts = (dummyJsonProducts) => {
    return dummyJsonProducts.map((product) => adaptDummyJsonToBackend(product));
};


export const generateMultipleProducts = (fakeStoreProducts, targetCount = 200) => {
    const adaptedProducts = adaptFakeStoreProducts(fakeStoreProducts);
    const result = [];
    let productIdCounter = 1;


    const variations = [
        "Premium", "Deluxe", "Standard", "Pro", "Ultra", "Classic", "Modern", 
        "Elite", "Basic", "Advanced", "Special", "Limited", "Edition", "Plus"
    ];


    const colors = ["Black", "White", "Red", "Blue", "Green", "Silver", "Gold", "Gray"];


    const productsPerOriginal = Math.ceil(targetCount / adaptedProducts.length);

    adaptedProducts.forEach((originalProduct, index) => {
        for (let i = 0; i < productsPerOriginal && result.length < targetCount; i++) {

            const variation = variations[i % variations.length];
            const color = colors[i % colors.length];
            const variationNumber = Math.floor(i / variations.length) + 1;
            

            let productName = originalProduct.productName;
            if (i > 0) {

                productName = `${variation} ${originalProduct.productName}`;
                if (variationNumber > 1) {
                    productName = `${productName} ${variationNumber}`;
                }

                if (i % 3 === 0) {
                    productName = `${color} ${productName}`;
                }
            }


            const priceMultiplier = 0.8 + (Math.random() * 0.4);
            const basePrice = parseFloat(originalProduct.price);
            const variedPrice = parseFloat((basePrice * priceMultiplier).toFixed(2));

            const hasDiscount = Math.random() < 0.3;
            const discountAmount = hasDiscount 
                ? parseFloat((variedPrice * (0.1 + Math.random() * 0.2)).toFixed(2))
                : 0;

            const quantity = Math.floor(Math.random() * 150) + 5;

            let images = [];
            if (originalProduct.images && Array.isArray(originalProduct.images) && originalProduct.images.length > 0) {
                images = [...originalProduct.images];
            } else if (originalProduct.image) {
                images = [originalProduct.image];
            } else {
                images = ["https://via.placeholder.com/300x250?text=No+Image"];
            }
            
            images = images.filter(img => img && typeof img === 'string' && img.trim() !== '');
            if (images.length === 0) {
                images = ["https://via.placeholder.com/300x250?text=No+Image"];
            }

            const newProduct = {
                ...originalProduct,
                productId: `prod_${productIdCounter++}`,
                productName: productName,
                price: variedPrice,
                discount: discountAmount,
                quantity: quantity,
                inStock: Math.random() > 0.1,
                images: images,
            };

            result.push(newProduct);
        }
    });

    return result.slice(0, targetCount);
};


export const formatProductForDisplay = (product) => {
    const finalPrice = product.discount > 0 
        ? (product.price - product.discount).toFixed(2)
        : product.price.toFixed(2);


    const images = product.images && Array.isArray(product.images) && product.images.length > 0
        ? [...product.images]
        : (product.image ? [product.image] : ["https://via.placeholder.com/300x250?text=No+Image"]);

    return {
        ...product,
        images: images,
        finalPrice: parseFloat(finalPrice),
        hasDiscount: product.discount > 0,
        discountPercentage: product.discount > 0 
            ? Math.round((product.discount / product.price) * 100)
            : 0,
    };
};

