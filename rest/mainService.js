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
      const user = u.id();
      const data = {user};
      ['fio', 'birthDate', 'type', 'docSer', 'docNum', 'docDate'].forEach((nm) => {
        if (req.body[nm]) {
          data[nm] = req.body[nm];
        }
      });
      return options.dataRepo.getList('applicant@pass-back-ru', {filter: {[F.EQUAL]: ['$user', user]}})
        .then((applicants) => {
          if (applicants && applicants[0]) {
            return options.dataRepo.saveItem('applicant@pass-back-ru', applicants[0].getItemId(), data);
          }
          return options.dataRepo.createItem('applicant@pass-back-ru', data);
        })
        .then(applicant => !!applicant);
    });

    this.addHandler(router, '/passports', 'GET', (req) => {
      const u = options.auth.getUser(req);
      const opts = {
        filter: {[F.EQUAL]: ['$applicant', u.properties().applicant]},
        forceEnrichment: [['applicant'],['target']]
      };
      return options.dataRepo.getList('pass@pass-back-ru', opts)
        .then(list => normalize(list));
    });

    this.addHandler(router, '/passport/:id', 'GET', (req) => {
      const u = options.auth.getUser(req);
      const opts = {
        filter: {[F.EQUAL]: ['$applicant', u.properties().applicant]},
        forceEnrichment: [['applicant'],['target']]
      };
      return options.dataRepo.getItem('pass@pass-back-ru', req.params.id, opts)
        .then((pass) => {
          if (!pass) {
            return null;
          }
          return normalize(pass);
        });
    });
  };
}
mainService.prototype = new Service();
module.exports = mainService;
