async function loadHotels(options = {}) {
    console.log("Loading hotels...");
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('hotelsList').innerHTML = '';
    // Mock load
    setTimeout(() => {
        document.getElementById('loadingState').style.display = 'none';
        const hotels = [{id:'1', name:'Test Hotel', location:'Nairobi, Kenya', rating: 4, unlockFee: 0, reward: 500, status: 'AVAILABLE', description: 'Nice hotel.'}];
        const list = document.getElementById('hotelsList');
        if(hotels.length === 0) document.getElementById('emptyState').style.display = 'block';
        
        hotels.forEach(h => {
            list.innerHTML += `
                <div class="card hotel-card">
                    <h3>${h.name} - ${h.location}</h3>
                    <p>${h.description}</p>
                    <p>Unlock: KES ${h.unlockFee} | Reward: KES ${h.reward}</p>
                    <span class="badge">${h.status}</span>
                    <button onclick="window.location.href='/hotel.html?id=${h.id}'">View Assignment</button>
                </div>
            `;
        });
    }, 1000);
}

async function loadHotel(hotelId) {
    document.getElementById('hotelName').innerText = "Loaded Hotel";
    document.getElementById('hotelLocation').innerText = "Nairobi, Kenya";
    document.getElementById('hotelBrief').innerText = "Please write a detailed review.";
    document.getElementById('reviewFormSection').style.display = 'block';

    const bodyInput = document.getElementById('bodyInput');
    const wordCount = document.getElementById('wordCount');
    const submitBtn = document.getElementById('submitReviewBtn');
    bodyInput.addEventListener('input', () => {
        const words = bodyInput.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.innerText = words;
        submitBtn.disabled = words < 100;
    });
}

async function unlockHotelReview(hotelId) {
    console.log('Unlocking', hotelId);
}

async function submitHotelReview(hotelTaskId, reviewData) {
    console.log('Submitting', reviewData);
}
