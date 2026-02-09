# Dokumentasi Backend - Sistem Pengelolaan Stok dengan FEFO/FIFO

## 📋 Daftar Isi
1. [Struktur Database](#struktur-database)
2. [API Endpoints](#api-endpoints)
3. [Logika FEFO/FIFO](#logika-fefofifo)
4. [Contoh Implementasi](#contoh-implementasi)

---

## 🗄️ Struktur Database

### 1. Tabel `stock_ins`
Menyimpan data barang masuk ke gudang.

```sql
CREATE TABLE stock_ins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE, -- STK-IN-2025-001
    warehouse_id BIGINT NOT NULL,
    user_id BIGINT,
    date DATE NOT NULL,
    notes TEXT,
    total_quantity INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2. Tabel `stock_in_products`
Menyimpan detail produk yang masuk (dengan expiry date untuk FEFO).

```sql
CREATE TABLE stock_in_products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    stock_in_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2),
    expiry_date DATE, -- PENTING untuk FEFO
    batch_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (stock_in_id) REFERENCES stock_ins(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 3. Tabel `stock_balances`
**PENTING**: Tabel ini untuk tracking stok per batch (untuk FEFO/FIFO).

```sql
CREATE TABLE stock_balances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    warehouse_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    stock_in_id BIGINT NOT NULL, -- Reference ke batch
    quantity_remaining INT NOT NULL DEFAULT 0,
    date_in DATE NOT NULL,
    expiry_date DATE, -- PENTING untuk FEFO
    batch_number VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (stock_in_id) REFERENCES stock_ins(id),
    INDEX idx_product_warehouse (product_id, warehouse_id),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_date_in (date_in)
);
```

### 4. Tabel `vending_machines`
Menyimpan data vending machine.

```sql
CREATE TABLE vending_machines (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 5. Tabel `stock_transfers`
Menyimpan data transfer dari gudang ke vending machine.

```sql
CREATE TABLE stock_transfers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE, -- TRF-2025-001
    from_warehouse_id BIGINT NOT NULL,
    to_vending_machine_id BIGINT NOT NULL,
    user_id BIGINT,
    date DATE NOT NULL,
    reference VARCHAR(100), -- No. DO, Surat Jalan, dll
    notes TEXT,
    total_quantity INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (to_vending_machine_id) REFERENCES vending_machines(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 6. Tabel `stock_transfer_products`
Menyimpan detail produk yang ditransfer (dengan reference ke batch yang digunakan).

```sql
CREATE TABLE stock_transfer_products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    stock_transfer_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    stock_in_id BIGINT, -- Reference ke batch yang digunakan (FEFO/FIFO)
    quantity INT NOT NULL,
    price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (stock_transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (stock_in_id) REFERENCES stock_ins(id)
);
```

### 7. Tabel `vending_machine_stocks`
Menyimpan stok di vending machine.

```sql
CREATE TABLE vending_machine_stocks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vending_machine_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    stock_in_id BIGINT NOT NULL, -- Reference ke batch
    quantity INT NOT NULL,
    expiry_date DATE,
    date_transferred DATE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (vending_machine_id) REFERENCES vending_machines(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (stock_in_id) REFERENCES stock_ins(id)
);
```

---

## 🔌 API Endpoints

### 1. Stock In Endpoints

#### GET `/api/stock-ins`
Mengambil semua stock in.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "STK-IN-2025-001",
      "warehouse_id": 1,
      "warehouse": {
        "id": 1,
        "name": "Gudang Utama"
      },
      "date": "2025-01-15",
      "total_quantity": 100,
      "stock_in_products": [
        {
          "id": 1,
          "product_id": 1,
          "product": {
            "id": 1,
            "name": "Product A"
          },
          "quantity": 50,
          "expiry_date": "2025-12-31",
          "batch_number": "BATCH-001"
        }
      ]
    }
  ]
}
```

#### POST `/api/stock-ins`
Membuat stock in baru.

**Request Body:**
```json
{
  "warehouse_id": 1,
  "date": "2025-01-15",
  "notes": "Barang masuk dari supplier",
  "products": [
    {
      "product_id": 1,
      "quantity": 50,
      "price": 10000,
      "expiry_date": "2025-12-31",
      "batch_number": "BATCH-001",
      "notes": "Batch pertama"
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "code": "STK-IN-2025-001",
    ...
  }
}
```

**Backend Logic:**
1. Generate `code` (STK-IN-YYYY-XXX)
2. Simpan ke `stock_ins`
3. Simpan setiap product ke `stock_in_products`
4. **PENTING**: Buat/update `stock_balances` untuk setiap product:
   - Jika batch sudah ada, tambahkan `quantity_remaining`
   - Jika batch baru, buat record baru dengan `quantity_remaining = quantity`

#### GET `/api/stock-ins/{id}`
Mengambil detail stock in.

#### PUT `/api/stock-ins/{id}`
Update stock in.

#### DELETE `/api/stock-ins/{id}`
Hapus stock in (dan update `stock_balances`).

---

### 2. Stock Transfer Endpoints

#### GET `/api/stock-transfers`
Mengambil semua stock transfer.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "TRF-2025-001",
      "from_warehouse_id": 1,
      "from_warehouse": {
        "id": 1,
        "name": "Gudang Utama"
      },
      "to_vending_machine_id": 1,
      "to_vending_machine": {
        "id": 1,
        "name": "VM-001",
        "location": "Lantai 1"
      },
      "date": "2025-01-20",
      "total_quantity": 30,
      "stock_transfer_products": [
        {
          "id": 1,
          "product_id": 1,
          "product": {
            "id": 1,
            "name": "Product A"
          },
          "stock_in_id": 1,
          "stock_in": {
            "id": 1,
            "code": "STK-IN-2025-001",
            "expiry_date": "2025-12-31"
          },
          "quantity": 30
        }
      ]
    }
  ]
}
```

#### POST `/api/stock-transfers`
**PENTING**: Endpoint ini harus mengimplementasikan logika FEFO/FIFO.

**Request Body:**
```json
{
  "from_warehouse_id": 1,
  "to_vending_machine_id": 1,
  "date": "2025-01-20",
  "reference": "DO-001",
  "notes": "Transfer ke vending machine",
  "products": [
    {
      "product_id": 1,
      "quantity": 30
    }
  ]
}
```

**Backend Logic (FEFO/FIFO):**
```php
// Pseudocode untuk logika FEFO/FIFO
foreach ($request->products as $product) {
    $productId = $product['product_id'];
    $quantityNeeded = $product['quantity'];
    
    // 1. Ambil stock_balances yang tersedia untuk product ini di warehouse
    $availableBalances = StockBalance::where('product_id', $productId)
        ->where('warehouse_id', $request->from_warehouse_id)
        ->where('quantity_remaining', '>', 0)
        ->orderBy('expiry_date', 'ASC') // FEFO: expiry terdekat dulu
        ->orderBy('date_in', 'ASC')     // FIFO: jika expiry sama atau tidak ada
        ->get();
    
    $remainingQuantity = $quantityNeeded;
    
    // 2. Loop melalui balances dan kurangi quantity
    foreach ($availableBalances as $balance) {
        if ($remainingQuantity <= 0) break;
        
        $quantityToTake = min($remainingQuantity, $balance->quantity_remaining);
        
        // 3. Kurangi quantity_remaining di stock_balances
        $balance->quantity_remaining -= $quantityToTake;
        $balance->save();
        
        // 4. Simpan ke stock_transfer_products dengan stock_in_id reference
        StockTransferProduct::create([
            'stock_transfer_id' => $stockTransfer->id,
            'product_id' => $productId,
            'stock_in_id' => $balance->stock_in_id, // Reference ke batch
            'quantity' => $quantityToTake,
        ]);
        
        // 5. Tambah ke vending_machine_stocks
        VendingMachineStock::create([
            'vending_machine_id' => $request->to_vending_machine_id,
            'product_id' => $productId,
            'stock_in_id' => $balance->stock_in_id,
            'quantity' => $quantityToTake,
            'expiry_date' => $balance->expiry_date,
            'date_transferred' => $request->date,
        ]);
        
        $remainingQuantity -= $quantityToTake;
    }
    
    // 6. Jika remainingQuantity > 0, berarti stok tidak cukup
    if ($remainingQuantity > 0) {
        throw new Exception("Stok tidak cukup untuk product ID: {$productId}");
    }
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "code": "TRF-2025-001",
    ...
  }
}
```

#### GET `/api/stock-transfers/{id}`
Mengambil detail stock transfer.

#### PUT `/api/stock-transfers/{id}`
Update stock transfer (dengan FEFO/FIFO logic).

#### DELETE `/api/stock-transfers/{id}`
Hapus stock transfer (dan kembalikan stok ke gudang).

---

### 3. Stock Balance Endpoints

#### GET `/api/stock-balances`
Mengambil semua stock balance.

**Query Parameters:**
- `warehouse_id` (optional): Filter by warehouse
- `product_id` (optional): Filter by product

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "warehouse_id": 1,
      "warehouse": {
        "id": 1,
        "name": "Gudang Utama"
      },
      "product_id": 1,
      "product": {
        "id": 1,
        "name": "Product A"
      },
      "stock_in_id": 1,
      "stock_in": {
        "id": 1,
        "code": "STK-IN-2025-001"
      },
      "quantity_remaining": 20,
      "date_in": "2025-01-15",
      "expiry_date": "2025-12-31",
      "batch_number": "BATCH-001"
    }
  ]
}
```

**Backend Logic:**
- Filter hanya yang `quantity_remaining > 0`
- Sort by FEFO/FIFO: `ORDER BY expiry_date ASC, date_in ASC`

#### GET `/api/stock-balances/product/{productId}`
Mengambil stock balance untuk product tertentu.

**Query Parameters:**
- `warehouse_id` (optional): Filter by warehouse

---

### 4. Vending Machine Endpoints

#### GET `/api/vending-machines`
Mengambil semua vending machines.

#### GET `/api/vending-machines/{id}`
Mengambil detail vending machine.

#### GET `/api/vending-machine-stocks`
Mengambil stok di vending machines.

**Query Parameters:**
- `vending_machine_id` (optional): Filter by vending machine

---

### 5. Expiry Alert Endpoint

#### GET `/api/expiry-alerts`
Mengambil produk yang akan expired.

**Query Parameters:**
- `days_ahead` (default: 30): Berapa hari ke depan

**Response:**
```json
{
  "data": [
    {
      "product_id": 1,
      "product_name": "Product A",
      "batch_code": "STK-IN-2025-001",
      "expiry_date": "2025-02-15",
      "days_until_expiry": 15,
      "quantity": 20,
      "warehouse_id": 1,
      "warehouse_name": "Gudang Utama",
      "status": "expiring_soon" // expired, expiring_soon, warning
    }
  ]
}
```

**Backend Logic:**
```sql
SELECT 
    sb.product_id,
    p.name AS product_name,
    si.code AS batch_code,
    sb.expiry_date,
    DATEDIFF(sb.expiry_date, CURDATE()) AS days_until_expiry,
    sb.quantity_remaining AS quantity,
    sb.warehouse_id,
    w.name AS warehouse_name,
    CASE
        WHEN sb.expiry_date < CURDATE() THEN 'expired'
        WHEN DATEDIFF(sb.expiry_date, CURDATE()) <= 7 THEN 'expiring_soon'
        ELSE 'warning'
    END AS status
FROM stock_balances sb
JOIN products p ON sb.product_id = p.id
JOIN stock_ins si ON sb.stock_in_id = si.id
LEFT JOIN warehouses w ON sb.warehouse_id = w.id
WHERE sb.quantity_remaining > 0
    AND sb.expiry_date IS NOT NULL
    AND DATEDIFF(sb.expiry_date, CURDATE()) <= :days_ahead
ORDER BY sb.expiry_date ASC;
```

---

## 🎯 Logika FEFO/FIFO

### Prioritas:
1. **FEFO (First Expired First Out)**: Produk dengan `expiry_date` terdekat diprioritaskan
2. **FIFO (First In First Out)**: Jika `expiry_date` sama atau tidak ada, gunakan `date_in` tertua

### Contoh:
```
Batch A: date_in = 2025-01-01, expiry = 2025-12-31
Batch B: date_in = 2025-01-15, expiry = 2025-11-30
Batch C: date_in = 2025-02-01, expiry = 2025-12-31
```

**Urutan keluar:**
1. Batch B (expiry 2025-11-30) ← FEFO
2. Batch A (expiry 2025-12-31, date_in lebih lama) ← FIFO
3. Batch C (expiry 2025-12-31, date_in lebih baru)

### SQL Query untuk FEFO/FIFO:
```sql
SELECT * FROM stock_balances
WHERE product_id = :product_id
    AND warehouse_id = :warehouse_id
    AND quantity_remaining > 0
ORDER BY 
    CASE WHEN expiry_date IS NOT NULL THEN expiry_date ELSE '9999-12-31' END ASC,
    date_in ASC;
```

---

## 💡 Contoh Implementasi Laravel

### Model: StockBalance.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockBalance extends Model
{
    protected $fillable = [
        'warehouse_id',
        'product_id',
        'stock_in_id',
        'quantity_remaining',
        'date_in',
        'expiry_date',
        'batch_number',
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function stockIn()
    {
        return $this->belongsTo(StockIn::class);
    }

    /**
     * Get available balances for FEFO/FIFO
     */
    public static function getAvailableForTransfer($productId, $warehouseId)
    {
        return self::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->where('quantity_remaining', '>', 0)
            ->orderByRaw('COALESCE(expiry_date, "9999-12-31") ASC')
            ->orderBy('date_in', 'ASC')
            ->get();
    }
}
```

### Controller: StockTransferController.php
```php
<?php

namespace App\Http\Controllers;

use App\Models\StockTransfer;
use App\Models\StockBalance;
use App\Models\VendingMachineStock;
use Illuminate\Http\Request;

class StockTransferController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'from_warehouse_id' => 'required|exists:warehouses,id',
            'to_vending_machine_id' => 'required|exists:vending_machines,id',
            'date' => 'required|date',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
        ]);

        $stockTransfer = StockTransfer::create([
            'code' => $this->generateCode(),
            'from_warehouse_id' => $request->from_warehouse_id,
            'to_vending_machine_id' => $request->to_vending_machine_id,
            'user_id' => auth()->id(),
            'date' => $request->date,
            'reference' => $request->reference,
            'notes' => $request->notes,
            'total_quantity' => 0,
        ]);

        $totalQuantity = 0;

        foreach ($request->products as $productData) {
            $productId = $productData['product_id'];
            $quantityNeeded = $productData['quantity'];

            // Get available balances (FEFO/FIFO)
            $availableBalances = StockBalance::getAvailableForTransfer(
                $productId,
                $request->from_warehouse_id
            );

            $remainingQuantity = $quantityNeeded;

            foreach ($availableBalances as $balance) {
                if ($remainingQuantity <= 0) break;

                $quantityToTake = min($remainingQuantity, $balance->quantity_remaining);

                // Check if enough stock
                if ($balance->quantity_remaining < $quantityToTake) {
                    throw new \Exception("Stok tidak cukup untuk product ID: {$productId}");
                }

                // Update stock balance
                $balance->quantity_remaining -= $quantityToTake;
                $balance->save();

                // Create stock transfer product
                $stockTransfer->stockTransferProducts()->create([
                    'product_id' => $productId,
                    'stock_in_id' => $balance->stock_in_id,
                    'quantity' => $quantityToTake,
                ]);

                // Add to vending machine stock
                VendingMachineStock::create([
                    'vending_machine_id' => $request->to_vending_machine_id,
                    'product_id' => $productId,
                    'stock_in_id' => $balance->stock_in_id,
                    'quantity' => $quantityToTake,
                    'expiry_date' => $balance->expiry_date,
                    'date_transferred' => $request->date,
                ]);

                $remainingQuantity -= $quantityToTake;
                $totalQuantity += $quantityToTake;
            }

            if ($remainingQuantity > 0) {
                throw new \Exception("Stok tidak cukup untuk product ID: {$productId}. Kekurangan: {$remainingQuantity} unit");
            }
        }

        $stockTransfer->update(['total_quantity' => $totalQuantity]);

        return response()->json([
            'data' => $stockTransfer->load(['fromWarehouse', 'toVendingMachine', 'stockTransferProducts.product', 'stockTransferProducts.stockIn']),
        ], 201);
    }

    private function generateCode()
    {
        $year = date('Y');
        $lastTransfer = StockTransfer::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $number = $lastTransfer ? (int) substr($lastTransfer->code, -3) + 1 : 1;

        return 'TRF-' . $year . '-' . str_pad($number, 3, '0', STR_PAD_LEFT);
    }
}
```

---

## ✅ Checklist Implementasi Backend

- [ ] Buat migration untuk semua tabel
- [ ] Buat model untuk semua tabel
- [ ] Implementasi Stock In CRUD
- [ ] Implementasi Stock Transfer dengan FEFO/FIFO
- [ ] Implementasi Stock Balance query dengan sorting FEFO/FIFO
- [ ] Implementasi Expiry Alert endpoint
- [ ] Implementasi Vending Machine CRUD
- [ ] Implementasi Vending Machine Stock query
- [ ] Test semua endpoint
- [ ] Test logika FEFO/FIFO dengan berbagai skenario

---

## 📝 Catatan Penting

1. **Stock Balance harus selalu diupdate** saat:
   - Stock In dibuat (tambah quantity)
   - Stock Transfer dibuat (kurangi quantity)
   - Stock Transfer dihapus (kembalikan quantity)

2. **FEFO/FIFO harus diimplementasikan di backend**, bukan frontend, untuk memastikan konsistensi data.

3. **Validasi stok** harus dilakukan sebelum transfer untuk memastikan stok cukup.

4. **Transaction** harus digunakan untuk memastikan data konsisten jika terjadi error.

---

**Selamat mengimplementasikan! 🚀**

