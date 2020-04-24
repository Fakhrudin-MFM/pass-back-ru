const Service = require('modules/rest/lib/interfaces/Service');
const errors = require('core/errors/front-end');
const IonError = require('core/IonError');
const F = require('core/FunctionCodes');
const normalize = require('core/util/normalize');
const moment = require('moment');

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
      let u = options.auth.getUser(req);
      return Promise.resolve({
        properties: u.properties(),
        coactors: u.coactors()
      });
    });

    this.addHandler(router, '/check', 'POST', (req) => {
      let filter;
      if (req.body.type && req.body.docSer && req.body.docNum) {
        filter = [
          {[F.EQUAL]: ['$type', req.body.type]},
          {[F.EQUAL]: ['$docSer', req.body.docSer]},
          {[F.EQUAL]: ['$docNum', req.body.docNum]}
        ];
      } else if (req.body.fio && req.body.birthDate) {
        filter = [
          {[F.EQUAL]: ['$fio', req.body.fio]},
          {[F.EQUAL]: ['$birthDate', moment(req.body.birthDate).toDate()]}
        ];
      } else {
        return Promise.reject(new IonError(422, {}, {message: 'Incomplete check conditions'}));
      }
      return options.dataRepo.getList('applicant@pass-back-ru', {filter: {[F.AND]: filter}})
        .then((list) => {
          if (!list || !list.length) {
            return;
          }
          throw new IonError(409);
        });
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
      const u = options.auth.getUser(req);
      const opts = {
        filter: {[F.EQUAL]: ['$applicant', u.properties().applicant]}
      };
      return options.dataRepo.getList('pass@pass-back-ru', opts)
        .then(list => normalize(list));
    });
  };
}
mainService.prototype = new Service();
module.exports = mainService;