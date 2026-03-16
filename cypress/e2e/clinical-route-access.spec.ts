describe('Clinical route access', () => {
  const protectedClinicalRoutes = ['/staff/dentist', '/staff/hygienist'];

  protectedClinicalRoutes.forEach((path) => {
    it(`redirects unauthenticated users away from ${path}`, () => {
      cy.clearCookies();
      cy.request({
        url: path,
        failOnStatusCode: false,
        followRedirect: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([302, 307, 308]);
        expect(response.headers.location).to.include('/staff/login');
      });
    });
  });
});