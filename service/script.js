const checkboxes = document.querySelectorAll('.calc-checkbox');
const totalPriceElement = document.getElementById('total-price');
const computerCount = document.getElementById('computer-count');
const itSupportPrice = document.getElementById('it-support-price');

function calculateTotal() {
    let total = 0;
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            total += parseInt(checkbox.value);
        }
    });
    const count = parseInt(computerCount.value);
    const itPrice = count * 100;
    itSupportPrice.textContent = itPrice.toLocaleString('ka-GE') + ' ₾';
    total += itPrice;
    totalPriceElement.textContent = total.toLocaleString('ka-GE');
}

checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', calculateTotal);
});
computerCount.addEventListener('change', calculateTotal);

// განაცხადის ფორმა
const contactForm = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');
const submitBtn = document.getElementById('submit-btn');

contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const service = document.getElementById('f-service').value;

    if (!name || !phone || !service) {
        alert('გთხოვთ შეავსოთ სავალდებულო ველები (*)');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'იგზავნება...';

    const data = new FormData(contactForm);

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: data,
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            contactForm.style.display = 'none';
            formSuccess.style.display = 'block';
        } else {
            alert('შეცდომა. გთხოვთ სცადოთ მოგვიანებით.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'განაცხადის გაგზავნა';
        }
    } catch {
        alert('კავშირის შეცდომა. შეამოწმეთ ინტერნეტი.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'განაცხადის გაგზავნა';
    }
});