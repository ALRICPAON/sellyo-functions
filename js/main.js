function switchLang(lang) {
  fetch(`lang/${lang}.json`)
    .then(res => res.json())
    .then(data => {
      document.querySelector('.headline').textContent = data.headline;
      document.querySelector('.btn[href="register.html"]').textContent = data.createAccount;
      document.querySelector('.btn[href="login.html"]').textContent = data.login;

      const featureTitles = document.querySelectorAll('.feature h3');
      const featureDescs = document.querySelectorAll('.feature p');

      featureTitles.forEach((el, i) => {
        el.textContent = data.features[i].title;
      });

      featureDescs.forEach((el, i) => {
        el.textContent = data.features[i].desc;
      });
    });
}
