import productApi from "../api/productApi";
import { adaptDummyJsonProducts } from "./productAdapter";

const ensureCategoriesExist = async () => {
    const categories = [
        { categoryId: "cat1", categoryName: "Men's Clothing", description: "Men's clothing category" },
        { categoryId: "cat2", categoryName: "Women's Clothing", description: "Women's clothing category" },
        { categoryId: "cat3", categoryName: "Electronics", description: "Electronics category" },
        { categoryId: "cat4", categoryName: "Jewelery", description: "Jewelery category" },
        { categoryId: "cat0", categoryName: "Uncategorized", description: "Uncategorized products" },
    ];

    let createdCount = 0;
    let existingCount = 0;
    
    for (const category of categories) {
        try {
            try {
                await productApi.getCategoryById(category.categoryId);
                existingCount++;
                console.log(`ℹ️ Category already exists: ${category.categoryName} (${category.categoryId})`);
            } catch (notFoundError) {
                try {
                    await productApi.createCategory(category);
                    createdCount++;
                    console.log(`✅ Category created: ${category.categoryName} (${category.categoryId})`);
                } catch (createError) {
                    console.error(`❌ Error creating category ${category.categoryName}:`, {
                        status: createError.response?.status,
                        data: createError.response?.data,
                        message: createError.message
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Unexpected error with category ${category.categoryName}:`, {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        }
    }
    
    console.log(`📁 Categories: ${existingCount} existing, ${createdCount} created`);
    return { created: createdCount, existing: existingCount };
};

export const seedAllProductsToDatabase = async () => {
    try {
        console.log("🌱 Starting database seed with real products from DummyJSON...");
        
        console.log("📁 Ensuring categories exist...");
        await ensureCategoriesExist();
        console.log("✅ Categories ready");
        
        console.log("📥 Fetching products from DummyJSON API...");
        const dummyProducts = await productApi.getAllDummyJsonProducts();
        console.log(`✅ Fetched ${dummyProducts.length} real products from DummyJSON`);

        if (dummyProducts.length === 0) {
            return {
                success: false,
                error: "No products found in DummyJSON",
                message: "DummyJSON'dan ürün bulunamadı"
            };
        }

        console.log("🔄 Adapting products to backend format...");
        const adaptedProducts = adaptDummyJsonProducts(dummyProducts);
        console.log(`✅ Adapted ${adaptedProducts.length} products`);

        const productsForBackend = adaptedProducts.map(product => {
            const { productId, categoryName, ...productData } = product;
            return {
                productName: productData.productName || "Unnamed Product",
                quantity: productData.quantity || 0,
                price: productData.price || 0,
                discount: productData.discount || 0,
                description: productData.description || "",
                images: productData.images && productData.images.length > 0 ? productData.images : ["https://via.placeholder.com/300x250?text=No+Image"],
                inStock: productData.inStock !== undefined ? productData.inStock : true,
                categoryId: productData.categoryId || "cat0",
            };
        });

        console.log("📦 Sample product for backend:", JSON.stringify(productsForBackend[0], null, 2));

        console.log("📤 Sending products to backend (one by one)...");
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < productsForBackend.length; i++) {
            try {
                const product = productsForBackend[i];
                console.log(`📤 Adding product ${i + 1}/${productsForBackend.length}: ${product.productName}`);
                const response = await productApi.createProduct(product);
                
                const apiResponse = response.data;
                const savedProduct = apiResponse?.data || apiResponse;
                
                if (savedProduct) {
                    successCount++;
                    results.push(savedProduct);
                    console.log(`✅ Product ${i + 1} added successfully: ${product.productName}`);
                } else {
                    errorCount++;
                    errors.push(`Product ${i + 1} (${product.productName}): No response data`);
                    console.warn(`⚠️ Product ${i + 1} added but no response data`);
                }

                if ((i + 1) % 5 === 0) {
                    console.log(`📊 Progress: ${i + 1}/${productsForBackend.length} products processed (${successCount} success, ${errorCount} failed)`);
                }
            } catch (error) {
                errorCount++;
                const errorMessage = error.response?.data?.error?.message 
                    || error.response?.data?.message 
                    || error.response?.data?.error
                    || error.message 
                    || "Unknown error";
                errors.push(`Product ${i + 1} (${productsForBackend[i]?.productName || 'Unknown'}): ${errorMessage}`);
                console.error(`❌ Error adding product ${i + 1} (${productsForBackend[i]?.productName}):`, {
                    message: errorMessage,
                    status: error.response?.status,
                    data: error.response?.data,
                    fullError: error
                });
            }
        }

        console.log(`✅ Successfully added ${successCount} products to database!`);
        console.log(`❌ ${errorCount} products failed to add`);
        if (errors.length > 0) {
            console.error("📋 Error details:", errors);
        }

        let message = `${successCount} ürün database'e eklendi`;
        if (errorCount > 0) {
            message += `, ${errorCount} ürün eklenemedi`;
            if (errors.length > 0 && errors.length <= 5) {
                message += `\nHatalar: ${errors.join('; ')}`;
            } else if (errors.length > 5) {
                message += `\nİlk hatalar: ${errors.slice(0, 3).join('; ')}...`;
            }
        }

        return {
            success: successCount > 0,
            total: dummyProducts.length,
            added: successCount,
            failed: errorCount,
            errors: errors,
            message: message
        };
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message || "Unknown error",
            message: "Database'e ekleme sırasında hata oluştu"
        };
    }
};

