 // კალკულატორის ლოგიკა
        const checkboxes = document.querySelectorAll('.calc-checkbox');
        const totalPriceElement = document.getElementById('total-price');

        function calculateTotal() {
            let total = 0;
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    total += parseInt(checkbox.value);
                }
            });
            // ციფრების ანიმაციური ასახვა
            totalPriceElement.textContent = total.toLocaleString('ka-GE');
        }

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', calculateTotal);
        });