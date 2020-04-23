const Service = require('modules/rest/lib/interfaces/Service');
const errors = require('core/errors/front-end');
const IonError = require('core/IonError');

function mainService(options) {
  this._route = function(router) {
    this.addHandler(router, '/register', 'POST', (req) => {
      return new Promise((resolve, reject) => {
        options.auth.register({
            name: req.body.name,
            pwd: req.body.pwd
          }, err => err ? reject(err) : resolve()
        );
      });
    });

    this.addHandler(router, '/authenticate', 'POST', (req) => {
      return options.ws.authenticate({
        user: req.body.user,
        pwd: req.body.pwd,
        type: 'local'
      }).then((u) => {
        if (!u) {
          throw new IonError(errors.ACCESS_DENIED);
        }
        let id = u.id().split('@');
        return options.ws.generateToken(id[0], id[1]);
      });
    });

    this.addHandler(router, '/profile', 'GET', (req) => {
      //GET метод получения данных профиля пользователя (данные из applicant)
      let u = options.auth.getUser(req);
      //Также должны возвращаться все ассоциированные с пользователем роли безопасности.
      return Promise.resolve({
        coactors: u.coactors()
      });
    });

    this.addHandler(router, '/check', 'POST', (req) => {
      //POST метод проверки существования заявителя. Принимает на вход идентификационные данные заявителя -
      //либо ФИО + дата рождения, либо тип документа, серия, номер.
      //При отсутствии applicant с такими данными возвращает статус 200, при наличии - статус 409.
      //Токен сиситемы
      return Promise.resolve();
    });

    this.addHandler(router, '/apply', 'POST', (req) => {
      const u = options.auth.getUser(req);
      const data = {
        fio: req.body.fio,
        birthDate: req.body.birthDate,
        type: req.body.type,
        docSer: req.body.docSer,
        docNum: req.body.docNum,
        docDate: req.body.docDate,
        user: u.id()
      };
      return options.dataRepo.createItem('applicant@pass-back-ru', data)
        .then(applicant => !!applicant);
    });

    this.addHandler(router, '/passports', 'GET', (req) => {
      //Возвращает список пропусков (passport) пользователя.
      return Promise.resolve();
    });
  };
}
mainService.prototype = new Service();
module.exports = mainService;