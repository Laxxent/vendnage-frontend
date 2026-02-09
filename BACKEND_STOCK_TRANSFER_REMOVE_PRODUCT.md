# Backend Requirements: Remove Single Product from Stock Transfer

## 📋 Overview

Frontend telah diimplementasikan untuk fitur remove single product dari stock transfer. Backend perlu mengimplementasikan endpoint dan logika untuk:

1. **Remove single product** dari stock transfer
2. **Kembalikan stock** ke warehouse saat product di-remove
3. **Update stock balance** dan vending machine stocks

---

## 🔌 API Endpoint

### DELETE `/api/stock-transfers/{transferId}/products/{productId}`

**Method:** `DELETE`  
**URL:** `/api/stock-transfers/{transferId}/products/{productId}`

**Path Parameters:**
- `transferId` (integer, required): ID dari stock transfer
- `productId` (integer, required): ID dari product yang akan di-remove

**Request Example:**
```
DELETE /api/stock-transfers/1/products/5
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Product removed successfully",
  "data": {
    "transfer_id": 1,
    "product_id": 5,
    "quantity_returned": 10
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Product not found in stock transfer",
  "errors": {}
}
```

**Response Error (500):**
```json
{
  "success": false,
  "message": "Failed to remove product",
  "errors": {}
}
```

---

## 🔄 Business Logic

### Step-by-Step Process

1. **Validasi Request**
   - Pastikan `stock_transfer` dengan `transferId` exists
   - Pastikan `stock_transfer_product` dengan `productId` exists di transfer tersebut
   - Pastikan product belum di-remove sebelumnya

2. **Ambil Data yang Diperlukan**
   - Ambil `StockTransferProduct` record
   - Ambil `StockTransfer` untuk mendapatkan `from_warehouse_id` dan `to_vending_machine_id`
   - Ambil `stock_in_id` dari `StockTransferProduct` (untuk tracking batch)

3. **Kembalikan Stock ke Warehouse** (CRITICAL)
   ```php
   // Gunakan Database Transaction untuk memastikan konsistensi
   DB::transaction(function () use ($transferProduct, $transfer) {
       // 1. Update stock_balances: Tambah quantity_remaining
       $stockBalance = StockBalance::where('stock_in_id', $transferProduct->stock_in_id)
           ->where('warehouse_id', $transfer->from_warehouse_id)
           ->where('product_id', $transferProduct->product_id)
           ->lockForUpdate() // IMPORTANT: Lock untuk prevent race condition
           ->first();
       
       if ($stockBalance) {
           $stockBalance->quantity_remaining += $transferProduct->quantity;
           $stockBalance->save();
       } else {
           // Jika stock_balance tidak ada, buat baru
           StockBalance::create([
               'warehouse_id' => $transfer->from_warehouse_id,
               'product_id' => $transferProduct->product_id,
               'stock_in_id' => $transferProduct->stock_in_id,
               'quantity_remaining' => $transferProduct->quantity,
               'date_in' => $transferProduct->created_at ?? now(),
               'expiry_date' => $transferProduct->stockIn->expiry_date ?? null,
               'batch_number' => $transferProduct->stockIn->batch_number ?? null,
           ]);
       }
       
       // 2. Kurangi dari vending_machine_stocks
       $vendingMachineStock = VendingMachineStock::where('vending_machine_id', $transfer->to_vending_machine_id)
           ->where('product_id', $transferProduct->product_id)
           ->where('stock_in_id', $transferProduct->stock_in_id)
           ->lockForUpdate()
           ->first();
       
       if ($vendingMachineStock) {
           if ($vendingMachineStock->quantity >= $transferProduct->quantity) {
               $vendingMachineStock->quantity -= $transferProduct->quantity;
               $vendingMachineStock->save();
               
               // Jika quantity menjadi 0, hapus record
               if ($vendingMachineStock->quantity <= 0) {
                   $vendingMachineStock->delete();
               }
           } else {
               throw new Exception("Vending machine stock quantity is less than transfer product quantity");
           }
       }
       
       // 3. Hapus StockTransferProduct
       $transferProduct->delete();
       
       // 4. Update total_quantity di StockTransfer
       $transfer->decrement('total_quantity', $transferProduct->quantity);
       
       // 5. Jika tidak ada products lagi, bisa hapus transfer atau set status
       $remainingProducts = StockTransferProduct::where('stock_transfer_id', $transfer->id)->count();
       if ($remainingProducts === 0) {
           // Optional: Set status atau hapus transfer
           // $transfer->update(['status' => 'cancelled']);
       }
   });
   ```

4. **Error Handling**
   - Jika terjadi error, rollback semua perubahan (transaction akan handle ini)
   - Return error message yang jelas

---

## 📝 Implementation Example (Laravel)

### Controller Method

```php
<?php

namespace App\Http\Controllers;

use App\Models\StockTransfer;
use App\Models\StockTransferProduct;
use App\Models\StockBalance;
use App\Models\VendingMachineStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockTransferController extends Controller
{
    /**
     * Remove single product from stock transfer
     * 
     * @param int $transferId
     * @param int $productId
     * @return \Illuminate\Http\JsonResponse
     */
    public function removeProduct($transferId, $productId)
    {
        try {
            // 1. Validasi
            $transfer = StockTransfer::findOrFail($transferId);
            
            $transferProduct = StockTransferProduct::where('stock_transfer_id', $transferId)
                ->where('product_id', $productId)
                ->first();
            
            if (!$transferProduct) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found in stock transfer',
                ], 404);
            }
            
            // 2. Execute removal dengan transaction
            $quantityReturned = DB::transaction(function () use ($transferProduct, $transfer) {
                // Get stock_in_id untuk tracking batch
                $stockInId = $transferProduct->stock_in_id;
                $quantity = $transferProduct->quantity;
                
                // 3. Kembalikan stock ke warehouse
                $stockBalance = StockBalance::where('stock_in_id', $stockInId)
                    ->where('warehouse_id', $transfer->from_warehouse_id)
                    ->where('product_id', $transferProduct->product_id)
                    ->lockForUpdate()
                    ->first();
                
                if ($stockBalance) {
                    // Update existing balance
                    $stockBalance->quantity_remaining += $quantity;
                    $stockBalance->save();
                } else {
                    // Create new balance if doesn't exist
                    // Get stock_in data for expiry_date and batch_number
                    $stockIn = $transferProduct->stockIn;
                    
                    StockBalance::create([
                        'warehouse_id' => $transfer->from_warehouse_id,
                        'product_id' => $transferProduct->product_id,
                        'stock_in_id' => $stockInId,
                        'quantity_remaining' => $quantity,
                        'date_in' => $stockIn->date ?? now(),
                        'expiry_date' => $stockIn->expiry_date ?? null,
                        'batch_number' => $stockIn->batch_number ?? null,
                    ]);
                }
                
                // 4. Kurangi dari vending machine stocks
                $vendingMachineStock = VendingMachineStock::where('vending_machine_id', $transfer->to_vending_machine_id)
                    ->where('product_id', $transferProduct->product_id)
                    ->where('stock_in_id', $stockInId)
                    ->lockForUpdate()
                    ->first();
                
                if ($vendingMachineStock) {
                    if ($vendingMachineStock->quantity >= $quantity) {
                        $vendingMachineStock->quantity -= $quantity;
                        
                        if ($vendingMachineStock->quantity <= 0) {
                            $vendingMachineStock->delete();
                        } else {
                            $vendingMachineStock->save();
                        }
                    } else {
                        throw new \Exception("Vending machine stock quantity mismatch");
                    }
                }
                
                // 5. Hapus StockTransferProduct
                $transferProduct->delete();
                
                // 6. Update total_quantity
                $transfer->decrement('total_quantity', $quantity);
                
                return $quantity;
            });
            
            // 7. Log success
            Log::info("Product removed from stock transfer", [
                'transfer_id' => $transferId,
                'product_id' => $productId,
                'quantity_returned' => $quantityReturned,
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Product removed successfully',
                'data' => [
                    'transfer_id' => $transferId,
                    'product_id' => $productId,
                    'quantity_returned' => $quantityReturned,
                ],
            ], 200);
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Stock transfer not found',
            ], 404);
            
        } catch (\Exception $e) {
            Log::error("Error removing product from stock transfer", [
                'transfer_id' => $transferId,
                'product_id' => $productId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove product: ' . $e->getMessage(),
            ], 500);
        }
    }
}
```

### Route Definition

```php
// routes/api.php
Route::delete('/stock-transfers/{transferId}/products/{productId}', [StockTransferController::class, 'removeProduct'])
    ->middleware(['auth:sanctum']);
```

---

## ⚠️ Important Notes

### 1. Database Transaction
**CRITICAL:** Gunakan `DB::transaction()` untuk memastikan semua operasi atomic. Jika salah satu gagal, semua rollback.

### 2. Lock For Update
**CRITICAL:** Gunakan `lockForUpdate()` pada `StockBalance` dan `VendingMachineStock` untuk mencegah race condition saat multiple removes dilakukan bersamaan.

### 3. Stock Balance Calculation
- Pastikan `quantity_remaining` di `stock_balances` selalu akurat
- Jika `stock_balance` tidak ada untuk batch tertentu, buat baru dengan data dari `stock_in`

### 4. Vending Machine Stock
- Kurangi quantity dari `vending_machine_stocks`
- Jika quantity menjadi 0 atau kurang, hapus record

### 5. Total Quantity
- Update `total_quantity` di `stock_transfers` setelah remove

### 6. Error Handling
- Return error message yang jelas
- Log semua errors untuk debugging
- Jangan expose sensitive information di error message

---

## 🧪 Testing Scenarios

1. **Normal Remove**
   - Remove product yang ada di transfer
   - Verify stock balance bertambah
   - Verify vending machine stock berkurang
   - Verify stock transfer product dihapus

2. **Remove Last Product**
   - Remove product terakhir dari transfer
   - Verify transfer masih ada (atau dihapus sesuai business logic)

3. **Concurrent Removes**
   - Test multiple removes pada product yang sama (harus fail dengan lock)
   - Test multiple removes pada product berbeda (harus success)

4. **Error Cases**
   - Remove product yang tidak ada → 404
   - Remove dari transfer yang tidak ada → 404
   - Database error → 500 dengan rollback

---

## 🔄 Integration with Frontend

Frontend akan:
1. Call endpoint saat user klik "Remove" pada existing product
2. Show loading state saat processing
3. Show success notification setelah berhasil
4. Auto-refetch stock balance untuk update UI
5. Remove product dari form setelah success

**Expected Flow:**
```
User clicks Remove
  ↓
Frontend: Disable button, show "Removing..."
  ↓
API Call: DELETE /api/stock-transfers/{id}/products/{productId}
  ↓
Backend: Process removal (transaction)
  ↓
Backend: Return success
  ↓
Frontend: Show success toast, remove from form, refetch stock balance
```

---

## 📚 Related Endpoints

- `PUT /api/stock-transfers/{id}` - Update stock transfer (untuk add new products)
- `GET /api/stock-transfers/{id}` - Get stock transfer details
- `DELETE /api/stock-transfers/{id}` - Delete entire stock transfer

---

## ✅ Checklist

- [ ] Implement endpoint `DELETE /api/stock-transfers/{transferId}/products/{productId}`
- [ ] Implement database transaction untuk atomic operations
- [ ] Implement lock for update untuk prevent race conditions
- [ ] Update `stock_balances` (tambah quantity_remaining)
- [ ] Update `vending_machine_stocks` (kurangi quantity)
- [ ] Delete `stock_transfer_products` record
- [ ] Update `stock_transfers.total_quantity`
- [ ] Error handling dan logging
- [ ] Testing semua scenarios
- [ ] Documentation

---

**Selamat mengimplementasikan! 🚀**












