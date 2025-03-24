let csvData = [];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("csvFile").addEventListener("change", handleCSVUpload);
    document.getElementById("processBtn").addEventListener("click", processData);
});

function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            csvData = parseCSV(event.target.result);
            showStatus(`CSV cargado correctamente con ${csvData.length} productos`, "success");
        } catch (error) {
            showStatus(`Error en CSV: ${error.message}`, "error");
        }
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    return text
        .split("\n")
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
            const parts = line.split(";");
            if (parts.length < 9) throw new Error("Formato CSV incorrecto");

            const precioStr = parts[8]
                .trim()
                .replace(/[^\d,.-]/g, "")
                .replace(/\.(?=\d{3})/g, "")
                .replace(",", ".");

            return {
                nombre: parts[1].trim(),
                precio: parseFloat(precioStr) || 0
            };
        });
}

function processData() {
    const input = document.getElementById("productList").value || "";
    const products = parseInput(input);
    const results = [];
    let total = 0;
    let missingProducts = [];

    products.forEach((product) => {
        const bestMatch = findBestMatch(product.name);
        if (bestMatch) {
            const subtotal = product.quantity * bestMatch.precio;
            total += subtotal;
            results.push({
                name: product.name,
                quantity: product.quantity,
                precio: bestMatch.precio,
                subtotal: subtotal
            });
        } else {
            missingProducts.push(product.name);
        }
    });

    displayResults(results, total, missingProducts);
}

function parseInput(input) {
    if (!input) return [];

    return input
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .reduce((acc, line, index, arr) => {
            if (line.match(/^x$/i)) {
                if (index > 0 && index < arr.length - 1) {
                    const prevLine = arr[index - 1];
                    const nextLine = arr[index + 1];

                    if (prevLine && nextLine) {
                        acc.push({
                            name: prevLine,
                            quantity: parseQuantity(nextLine)
                        });
                    }
                }
            }
            return acc;
        }, []);
}

function parseQuantity(line) {
    const quantity = parseInt(line.replace(/\D/g, "")) || 1;
    return quantity > 0 ? quantity : 1;
}

function findBestMatch(searchTerm) {
    if (!csvData.length) return null;

    const search = searchTerm.toLowerCase();
    let bestMatch = { score: 0, data: null };

    csvData.forEach((item) => {
        const score = similarity(search, item.nombre.toLowerCase());
        if (score > bestMatch.score) {
            bestMatch = { score: score, data: item };
        }
    });

    return bestMatch.score > 0.3 ? bestMatch.data : null;
}

function similarity(a, b) {
    const maxLength = Math.max(a.length, b.length);
    const matrix = [];

    for (let i = 0; i <= a.length; i++) matrix[i] = [i];
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }

    return 1 - matrix[a.length][b.length] / maxLength;
}

function displayResults(results, total, missingProducts) {
    const container = document.getElementById("results");

    // Función para formatear números al estilo argentino
    const formatoArgentino = (numero) => {
        return numero.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true // Para quitar separadores de miles
        });
    };

    let html = `<table>
        <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio Unitario</th>
            <th>Subtotal</th>
        </tr>`;

    if (results.length === 0) {
        html += `<tr><td colspan="4">No se encontraron coincidencias</td></tr>`;
    } else {
        results.forEach((item) => {
            html += `<tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${formatoArgentino(item.precio)}</td>
                <td>$${formatoArgentino(item.subtotal)}</td>
            </tr>`;
        });
    }

    html += `<tr class="total-row">
        <td colspan="3"><strong>Total</strong></td>
        <td><strong>$${formatoArgentino(total)}</strong></td>
    </tr></table>`;

    if (missingProducts.length > 0) {
        html += `<div class="status-message error visible">
            Productos no encontrados: ${missingProducts.join(", ")}
        </div>`;
    }

    container.innerHTML = html;
}

function showStatus(message, type) {
    const statusElement = document.getElementById("csvStatus");
    statusElement.textContent = message;
    statusElement.className = `status-message ${type} visible`;
    setTimeout(() => (statusElement.className = "status-message"), 5000);
}
